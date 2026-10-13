import {
  addDays,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import type { ROLES } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";

const MONEY_ROLES: ROLES[] = ["SUPER_ADMIN", "ADMIN", "FINANCE"];
const TRAINING_ROLES: ROLES[] = ["SUPER_ADMIN", "ADMIN", "COACH"];

export const canSeeMoney = (role: ROLES | null) =>
  !!role && MONEY_ROLES.includes(role);
export const canSeeTraining = (role: ROLES | null) =>
  !!role && TRAINING_ROLES.includes(role);

/** Youngest age group first; non age-group batches after, Unassigned last. */
const batchOrder = (name: string) =>
  /unassigned/i.test(name) ? 1e4 : Number(name.match(/U(\d+)/i)?.[1] ?? 1e3);

/** Squad numbers every signed-in role may see. */
async function getSquad() {
  const [active, total, byBatch] = await Promise.all([
    db.athlete.count({ where: { isArchived: false, status: "ACTIVE" } }),
    db.athlete.count({ where: { isArchived: false } }),
    db.athlete.groupBy({
      by: ["batchesId"],
      where: { isArchived: false },
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
    byBatch: byBatch
      .map((b) => ({
        name: names.get(b.batchesId) ?? "Unknown",
        count: b._count._all,
      }))
      .sort((a, b) => batchOrder(a.name) - batchOrder(b.name)),
  };
}

/**
 * The week's sessions. Coaches only see sessions they run; admins see all.
 */
async function getWeek(userId: string, role: ROLES | null) {
  const now = new Date();
  const from = startOfWeek(now, { weekStartsOn: 1 });
  const to = endOfWeek(now, { weekStartsOn: 1 });

  const where: Prisma.trainingWhereInput = {
    isArchived: false,
    date: { gte: from, lte: to },
    ...(role === "COACH" ? { coach: { userId } } : {}),
  };

  const sessions = await db.training.findMany({
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
  });

  const today = startOfDay(now);
  return {
    sessions,
    todayCount: sessions.filter(
      (s) => s.date >= today && s.date < addDays(today, 1),
    ).length,
  };
}

type MonthRow = { month: Date; total: Prisma.Decimal | number | null };

async function getMoney() {
  const now = new Date();
  const yearStart = startOfMonth(subMonths(now, 11));

  const [month, outstanding, overdue, recent, monthly] = await Promise.all([
    db.finance.aggregate({
      _sum: { amountPaid: true },
      where: {
        isArchived: false,
        paymentDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
    }),
    db.invoice.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      _sum: { amountDue: true, amountPaid: true },
    }),
    db.invoice.count({ where: { status: "OVERDUE" } }),
    db.finance.findMany({
      where: { isArchived: false },
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
      WHERE "isArchived" = false AND payment_date >= ${yearStart}
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

  return {
    collectedThisMonth: month._sum.amountPaid ?? 0,
    outstanding:
      Number(outstanding._sum.amountDue ?? 0) -
      Number(outstanding._sum.amountPaid ?? 0),
    overdueInvoices: overdue,
    recent,
    income,
  };
}

export async function getDashboard(userId: string, role: ROLES | null) {
  const [squad, week, money] = await Promise.all([
    getSquad(),
    canSeeTraining(role) ? getWeek(userId, role) : null,
    canSeeMoney(role) ? getMoney() : null,
  ]);
  return { squad, week, money };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
