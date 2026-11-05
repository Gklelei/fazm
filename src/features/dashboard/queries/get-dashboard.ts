import {
  addDays,
  endOfMonth,
  min,
  subDays,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import type { ROLES } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";
import { hasRole } from "@/lib/roles";
import { invoiceBalance } from "@/features/invoices/lib/status";
import { inProgramme } from "@/lib/programme-scope";

const canSeeMoney = (role: ROLES | null) => hasRole(role, "finance");
const canSeeTraining = (role: ROLES | null) => hasRole(role, "coaching");

/** Youngest age group first; non age-group batches after, Unassigned last. */
const batchOrder = (name: string) =>
  /unassigned/i.test(name) ? 1e4 : Number(name.match(/U(\d+)/i)?.[1] ?? 1e3);

/** Squad numbers every signed-in role may see. */
async function getSquad(programmeId: string | null) {
  const athletes = { isArchived: false, ...inProgramme.athlete(programmeId) };
  const [active, total, pending, joined, byBatch] = await Promise.all([
    db.athlete.count({ where: { ...athletes, status: "ACTIVE" } }),
    db.athlete.count({ where: athletes }),
    db.athlete.count({ where: { ...athletes, status: "PENDING" } }),
    db.athlete.count({ where: { ...athletes, createdAt: { gte: startOfMonth(new Date()) } } }),
    db.athlete.groupBy({
      by: ["batchesId"],
      where: athletes,
      _count: { _all: true },
    }),
  ]);
  const batches = await db.batches.findMany({
    where: { id: { in: byBatch.map((b) => b.batchesId) } },
    select: { id: true, name: true },
  });
  const names = new Map(batches.map((b) => [b.id, b.name]));
  return {
    active,
    total,
    pending,
    joined,
    byBatch: byBatch
      .map((b) => ({
        name: names.get(b.batchesId) ?? "Unknown",
        count: b._count._all,
      }))
      .sort((a, b) => b.count - a.count || batchOrder(a.name) - batchOrder(b.name)),
  };
}

/**
 * The week's sessions. Coaches only see sessions they run; admins see all.
 */
async function getWeek(userId: string, role: ROLES | null, programmeId: string | null) {
  const now = new Date();
  const from = startOfWeek(now, { weekStartsOn: 1 });
  const to = endOfWeek(now, { weekStartsOn: 1 });

  const where: Prisma.trainingWhereInput = {
    isArchived: false,
    date: { gte: from, lte: to },
    ...inProgramme.session(programmeId),
    ...(role === "COACH" ? { coach: { userId } } : {}),
  };

  const [sessions, unmarked] = await Promise.all([
    db.training.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      id: true,
      name: true,
      date: true,
      duration: true,
      status: true,
      batch: { select: { name: true } },
      coach: { select: { fullNames: true } },
      location: { select: { name: true } },
      _count: { select: { athletes: true, attendances: true } },
    },
  }),
    // Sessions that have happened but nobody took attendance
    db.training.count({
      where: {
        isArchived: false,
        date: { gte: subDays(now, 14), lt: now },
        status: { not: "CANCELLED" },
        attendances: { none: {} },
        athletes: { some: {} },
        ...inProgramme.session(programmeId),
        ...(role === "COACH" ? { coach: { userId } } : {}),
      },
    }),
  ]);

  const today = startOfDay(now);
  return {
    sessions,
    upcoming: sessions.filter((s) => s.date >= today),
    unmarked,
    todayCount: sessions.filter(
      (s) => s.date >= today && s.date < addDays(today, 1),
    ).length,
  };
}

type MonthRow = { month: Date; total: Prisma.Decimal | number | null };

async function getMoney(programmeId: string | null) {
  const payments = inProgramme.payment(programmeId);
  const invoices = inProgramme.invoice(programmeId);
  // The month totals are summed in SQL: the same programme filter, by hand
  const inScope = programmeId
    ? Prisma.sql`AND "athleteId" IN (SELECT a.athlete_id FROM athlete a JOIN batches b ON b.id = a.batches_id WHERE b.programme_id = ${programmeId})`
    : Prisma.empty;
  const now = new Date();
  const yearStart = startOfMonth(subMonths(now, 11));

  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const [month, lastMonthToDate, outstanding, overdue, recent, monthly] = await Promise.all([
    db.finance.aggregate({
      _sum: { amountPaid: true },
      where: {
        isArchived: false,
        ...payments,
        paymentDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
    }),
    // Last month up to the same day, for a like-for-like comparison
    db.finance.aggregate({
      _sum: { amountPaid: true },
      where: {
        isArchived: false,
        ...payments,
        paymentDate: { gte: lastMonthStart, lte: min([subMonths(now, 1), endOfMonth(lastMonthStart)]) },
      },
    }),
    db.invoice.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, ...invoices },
      _sum: { amountDue: true, amountPaid: true, discount: true },
    }),
    db.invoice.aggregate({ where: { status: "OVERDUE", ...invoices }, _sum: { amountDue: true, amountPaid: true, discount: true }, _count: { _all: true } }),
    db.finance.findMany({
      where: { isArchived: false, ...payments },
      orderBy: { paymentDate: "desc" },
      take: 6,
      select: {
        id: true,
        amountPaid: true,
        paymentType: true,
        paymentDate: true,
        receiptNumber: true,
        athlete: { select: { firstName: true, lastName: true } },
      },
    }),
    // Summed in the database instead of shipping a year of rows to the page
    db.$queryRaw<MonthRow[]>`
      SELECT date_trunc('month', payment_date) AS month,
             SUM(amount_paid) AS total
      FROM finance
      WHERE "isArchived" = false AND payment_date >= ${yearStart} ${inScope}
      GROUP BY 1`,
  ]);

  // date_trunc runs in the database's UTC; key months by calendar y-m
  const totals = new Map(
    monthly.map((r) => {
      const m = new Date(r.month);
      return [`${m.getUTCFullYear()}-${m.getUTCMonth()}`, Number(r.total ?? 0)];
    }),
  );
  const income = Array.from({ length: 12 }, (_, i) => {
    const d = startOfMonth(subMonths(now, 11 - i));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return {
      key,
      label: d.toLocaleString("en-GB", { month: "short" }),
      total: totals.get(key) ?? 0,
    };
  });

  const collectedThisMonth = month._sum.amountPaid ?? 0;
  const lastMonth = lastMonthToDate._sum.amountPaid ?? 0;
  return {
    collectedThisMonth,
    change: lastMonth ? (collectedThisMonth - lastMonth) / lastMonth : null,
    outstanding: invoiceBalance(outstanding._sum),
    overdueInvoices: overdue._count._all,
    overdueAmount: invoiceBalance(overdue._sum),
    recent,
    income,
  };
}

/** Every figure is for the header's programme; null: all programmes. */
export async function getDashboard(userId: string, role: ROLES | null, programmeId: string | null = null) {
  const [squad, week, money] = await Promise.all([
    getSquad(programmeId),
    canSeeTraining(role) ? getWeek(userId, role, programmeId) : null,
    canSeeMoney(role) ? getMoney(programmeId) : null,
  ]);
  return { squad, week, money };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
