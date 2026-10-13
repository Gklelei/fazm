import { startOfDay, subDays, startOfMonth, format } from "date-fns";
import { db } from "@/lib/prisma";
import { SendMail } from "@/lib/mailtrap";
import { formatCurrency } from "@/lib/format";
import { ageFromDob } from "./age";

/**
 * Scheduled jobs. Each returns a small summary that is logged and stored in
 * the activity log, so every run can be checked afterwards. The server
 * crontab triggers them through /api/cron-jobs/<name> (see scripts/cron/).
 * Times are server-local (Africa/Nairobi).
 */
export type JobResult = Record<string, string | number | boolean | string[]>;
export type JobOptions = { dryRun?: boolean; now?: Date };

/** Invoices still unpaid the day after their due date become OVERDUE. */
export async function overdueInvoices({ now = new Date() }: JobOptions = {}): Promise<JobResult> {
  const { count } = await db.invoice.updateMany({
    where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: startOfDay(now) } },
    data: { status: "OVERDUE" },
  });
  return { markedOverdue: count };
}

/** Scheduled → In progress once a session starts; → Completed once it ends. */
export async function sessionStatus({ now = new Date() }: JobOptions = {}): Promise<JobResult> {
  const completed = await db.$executeRaw`
    UPDATE training SET status = 'COMPLETED'
    WHERE "isArchived" = false AND status IN ('SCHEDULED', 'IN_PROGRESS')
      AND date + make_interval(mins => duration) <= ${now}`;
  const started = await db.$executeRaw`
    UPDATE training SET status = 'IN_PROGRESS'
    WHERE "isArchived" = false AND status = 'SCHEDULED'
      AND date <= ${now} AND date + make_interval(mins => duration) > ${now}`;
  return { completed, started };
}

/**
 * Keeps upcoming sessions' squads in step with their batch: athletes who
 * joined the batch are added, athletes who left it (or were removed or
 * deactivated) are taken off. Only future sessions with no attendance yet.
 */
export async function syncSessionAthletes({ now = new Date() }: JobOptions = {}): Promise<JobResult> {
  const sessions = await db.training.findMany({
    where: { isArchived: false, status: "SCHEDULED", date: { gt: now }, attendances: { none: {} } },
    select: {
      id: true,
      athletes: { select: { id: true } },
      batch: {
        select: {
          athletes: {
            where: { isArchived: false, status: { in: ["ACTIVE", "PENDING"] } },
            select: { id: true },
          },
        },
      },
    },
  });

  let added = 0;
  let removed = 0;
  let updated = 0;
  for (const s of sessions) {
    const want = new Set(s.batch.athletes.map((a) => a.id));
    const have = new Set(s.athletes.map((a) => a.id));
    const connect = [...want].filter((id) => !have.has(id)).map((id) => ({ id }));
    const disconnect = [...have].filter((id) => !want.has(id)).map((id) => ({ id }));
    if (!connect.length && !disconnect.length) continue;
    await db.training.update({ where: { id: s.id }, data: { athletes: { connect, disconnect } } });
    added += connect.length;
    removed += disconnect.length;
    updated += 1;
  }
  return { sessionsChecked: sessions.length, sessionsUpdated: updated, athletesAdded: added, athletesRemoved: removed };
}

/** Recomputes ages from date of birth; writes only ages that changed. */
export async function updateAges({ now = new Date() }: JobOptions = {}): Promise<JobResult> {
  const athletes = await db.athlete.findMany({
    where: { isArchived: false },
    select: { id: true, dateOfBirth: true, age: true },
  });
  const byAge = new Map<number, string[]>();
  let unreadable = 0;
  for (const a of athletes) {
    const age = ageFromDob(a.dateOfBirth, now);
    if (age === null) {
      unreadable += 1;
      continue;
    }
    if (age !== a.age) byAge.set(age, [...(byAge.get(age) ?? []), a.id]);
  }
  let changed = 0;
  for (const [age, ids] of byAge) {
    const r = await db.athlete.updateMany({ where: { id: { in: ids } }, data: { age } });
    changed += r.count;
  }
  return { checked: athletes.length, changed, unreadableDob: unreadable };
}

/**
 * Active athletes with no attendance (present or late) and no payment in the
 * last 90 days become Inactive. Athletes registered in the last 90 days and
 * Pending athletes are never touched. dryRun lists who would change.
 */
export async function deactivateInactive({ now = new Date(), dryRun = false }: JobOptions = {}): Promise<JobResult> {
  const since = subDays(now, 90);
  const idle = await db.athlete.findMany({
    where: {
      isArchived: false,
      status: "ACTIVE",
      createdAt: { lt: since },
      attendances: { none: { status: { in: ["PRESENT", "LATE"] }, createdAt: { gte: since } } },
      finances: { none: { isArchived: false, paymentDate: { gte: since } } },
    },
    select: { id: true, athleteId: true },
  });
  if (!dryRun && idle.length) {
    await db.athlete.updateMany({
      where: { id: { in: idle.map((a) => a.id) }, status: "ACTIVE" },
      data: { status: "DEACTIVATED" },
    });
  }
  return { dryRun, deactivated: idle.length, athleteIds: idle.map((a) => a.athleteId) };
}

/** Removes expired login sessions and used/expired reset tokens. */
export async function cleanupAuth({ now = new Date() }: JobOptions = {}): Promise<JobResult> {
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const tokens = await db.verification.deleteMany({ where: { expiresAt: { lt: now } } });
  return { expiredSessionsRemoved: sessions.count, expiredTokensRemoved: tokens.count };
}

/** Monday summary for the people in FINANCE_REPORT_EMAILS (comma-separated). */
export async function financeReport({ now = new Date(), dryRun = false }: JobOptions = {}): Promise<JobResult> {
  const to = (process.env.FINANCE_REPORT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (!to.length) return { sent: false, reason: "FINANCE_REPORT_EMAILS is not set" };

  const weekStart = startOfDay(subDays(now, 7));
  const [week, month, overdue, open] = await Promise.all([
    db.finance.aggregate({
      where: { isArchived: false, paymentDate: { gte: weekStart, lt: now } },
      _sum: { amountPaid: true },
      _count: { _all: true },
    }),
    db.finance.aggregate({
      where: { isArchived: false, paymentDate: { gte: startOfMonth(now), lt: now } },
      _sum: { amountPaid: true },
    }),
    db.invoice.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amountDue: true, amountPaid: true },
      _count: { _all: true },
    }),
    db.invoice.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      _sum: { amountDue: true, amountPaid: true },
    }),
  ]);

  const owed = (s: { amountDue: unknown; amountPaid: unknown }) =>
    Math.max(Number(s.amountDue ?? 0) - Number(s.amountPaid ?? 0), 0);
  const rows: [string, string][] = [
    [`Received ${format(weekStart, "d MMM")} – ${format(now, "d MMM")}`, `${formatCurrency(week._sum.amountPaid ?? 0)} (${week._count._all} payments)`],
    ["Collected so far this month", formatCurrency(month._sum.amountPaid ?? 0)],
    ["Overdue invoices", `${overdue._count._all} · ${formatCurrency(owed(overdue._sum))} owed`],
    ["Total still owed (all open invoices)", formatCurrency(owed(open._sum))],
  ];
  const subject = `Fazam finance summary · week to ${format(now, "d MMM yyyy")}`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = `<h2 style="font-family:sans-serif">${subject}</h2><table style="font-family:sans-serif;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#555">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`)
    .join("")}</table><p style="font-family:sans-serif;color:#888;font-size:12px">Sent automatically every Monday by the Fazam academy system.</p>`;

  if (dryRun) return { sent: false, dryRun: true, recipients: to.length, preview: text };
  const res = await SendMail({ to, subject, text, html });
  return { sent: res.success, recipients: to.length, ...(res.success ? {} : { error: res.message }) };
}

export const JOBS = {
  "overdue-invoices": overdueInvoices,
  "session-status": sessionStatus,
  "sync-session-athletes": syncSessionAthletes,
  "update-ages": updateAges,
  "deactivate-inactive": deactivateInactive,
  "cleanup-auth": cleanupAuth,
  "finance-report": financeReport,
} as const;

export type JobName = keyof typeof JOBS;
