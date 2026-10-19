import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { academyInstant, academyToday } from "@/lib/academy-time";
import { calculatePayslip, installmentOf, type Band, type DeductionKind, type Item } from "./calculate";

export type Adjustments = { allowances?: Item[]; oneOffs?: Item[]; advance?: number | null };

/** "2026-10" → its first instant and the next month's, Nairobi time. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: academyInstant(`${month}-01`, "00:00"), to: academyInstant(`${next}-01`, "00:00"), next };
}

export const currentMonth = (now = new Date()) => academyToday(now).slice(0, 7);

export const monthLabel = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

/**
 * Creates or refreshes a month's provisional payslips for everyone with a pay
 * profile. Safe to run again: payslips are updated in place, the admin's edits
 * are kept, and an approved month is never touched.
 */
export async function refreshPayroll(month: string, tx: Prisma.TransactionClient = db) {
  const run = await tx.payrollRun.upsert({ where: { month }, create: { month }, update: {} });
  if (run.status !== "PROVISIONAL") return { run, payslips: 0, locked: true };
  const { from, to } = monthRange(month);

  const [people, rules, kept] = await Promise.all([
    tx.staff.findMany({
      where: { isArchived: false, payBasis: { not: null } },
      select: {
        id: true,
        staffId: true,
        payBasis: true,
        salary: true,
        sessionRate: true,
        advances: {
          where: { status: "APPROVED", date: { lt: to } },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          // Earlier months' recoveries only; this month's are worked out again below
          select: { id: true, amount: true, months: true, recoveries: { where: { payslip: { run: { month: { lt: month } } } }, select: { amount: true } } },
        },
      },
    }),
    tx.payrollDeduction.findMany({ where: { enabled: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    tx.payslip.findMany({ where: { runId: run.id }, select: { id: true, staffId: true, adjustments: true } }),
  ]);
  const sessions = await tx.training.groupBy({
    by: ["staffId"],
    where: { status: "COMPLETED", isArchived: false, date: { gte: from, lt: to }, staffId: { in: people.filter((p) => p.payBasis === "PER_SESSION").map((p) => p.staffId) } },
    _count: { _all: true },
  });

  const keptBy = new Map(kept.map((k) => [k.staffId, k]));
  for (const p of people) {
    const adj = (keptBy.get(p.id)?.adjustments ?? {}) as Adjustments;
    const count = sessions.find((s) => s.staffId === p.staffId)?._count._all ?? 0;
    const perSession = p.payBasis === "PER_SESSION";
    const rate = num(p.sessionRate) ?? 0;
    const advances = p.advances
      .map((a) => {
        const amount = Number(a.amount);
        const outstanding = amount - a.recoveries.reduce((s, r) => s + Number(r.amount), 0);
        return { id: a.id, outstanding, installment: installmentOf(amount, a.months, outstanding) };
      })
      .filter((a) => a.outstanding > 0.004);
    const slip = calculatePayslip({
      basic: perSession ? count * rate : (num(p.salary) ?? 0),
      basicLabel: perSession ? `${count} sessions × ${rate.toLocaleString("en-KE")}` : "Basic salary",
      allowances: adj.allowances,
      oneOffs: adj.oneOffs,
      advanceOverride: adj.advance,
      advances,
      deductions: rules
        .filter((r) => !r.staffIds.length || r.staffIds.includes(p.id))
        .map((r) => ({
          name: r.name,
          kind: r.kind as DeductionKind,
          value: Number(r.value),
          bands: r.bands as Band[] | null,
          relief: Number(r.relief),
          minimum: num(r.minimum),
          maximum: num(r.maximum),
          beforeTax: r.beforeTax,
          employerPercent: Number(r.employerPercent),
        })),
    });
    const data = {
      basis: p.payBasis!,
      sessions: perSession ? count : null,
      basic: perSession ? count * rate : (num(p.salary) ?? 0),
      gross: slip.gross,
      deductions: slip.deductions,
      net: slip.net,
      employer: slip.employer,
      lines: slip.lines,
      overCap: slip.overCap,
    };
    const saved = await tx.payslip.upsert({
      where: { runId_staffId: { runId: run.id, staffId: p.id } },
      create: { runId: run.id, staffId: p.id, ...data },
      update: data,
    });
    await tx.advanceRecovery.deleteMany({ where: { payslipId: saved.id } });
    if (slip.recoveries.length) await tx.advanceRecovery.createMany({ data: slip.recoveries.map((r) => ({ payslipId: saved.id, advanceId: r.advanceId, amount: r.amount })) });
  }
  // Left, or no pay profile any more
  const gone = kept.filter((k) => !people.some((p) => p.id === k.staffId)).map((k) => k.id);
  if (gone.length) await tx.payslip.deleteMany({ where: { id: { in: gone } } });

  return { run, payslips: people.length, locked: false };
}

/** What's still owed on each advance, counting only approved payrolls as taken back. */
export async function advanceBalances(staffId: string) {
  const advances = await db.salaryAdvance.findMany({
    where: { staffId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { recoveries: { select: { amount: true, payslip: { select: { run: { select: { month: true, status: true } } } } } } },
  });
  return advances.map((a) => {
    const taken = a.recoveries.filter((r) => r.payslip.run.status !== "PROVISIONAL");
    const recovered = taken.reduce((s, r) => s + Number(r.amount), 0);
    return {
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      amount: Number(a.amount),
      method: a.method,
      reference: a.reference,
      reason: a.reason,
      months: a.months,
      status: a.status,
      recovered,
      outstanding: a.status === "APPROVED" ? Number(a.amount) - recovered : 0,
      recoveries: taken.map((r) => ({ month: r.payslip.run.month, amount: Number(r.amount) })),
    };
  });
}

/** Job: on the last day of the month (Nairobi), that month's provisional payslips. */
export async function payrollJob({ now = new Date(), dryRun = false } = {}) {
  const month = currentMonth(now);
  if (currentMonth(new Date(now.getTime() + 86_400_000)) === month) return { skipped: true, reason: "Not the last day of the month" };
  if (dryRun) return { month, dryRun: true };
  const res = await db.$transaction((tx) => refreshPayroll(month, tx), { timeout: 60_000 });
  return { month, payslips: res.payslips, locked: res.locked };
}
