import { addYears, differenceInCalendarDays, startOfDay, subYears } from "date-fns";
import { db } from "@/lib/prisma";
import { invoiceBalance } from "@/features/invoices/lib/status";
import { METHOD_LABEL } from "@/features/finance/lib/methods";
import { athleteName } from "@/features/athletes/lib/names";
import { bucketKeys, bucketOf, type ReportRange } from "../lib/range";
import { batchLabeller } from "../lib/batch-label";
import { inProgramme } from "@/lib/programme-scope";

const OPEN = ["PENDING", "PARTIAL", "OVERDUE"] as const;
const NO_BATCH = "No batch";

/** Adds `value` to `key` in a tally map. */
function tally<K>(m: Map<K, { count: number; amount: number }>, key: K, amount: number) {
  const t = m.get(key) ?? { count: 0, amount: 0 };
  t.count += 1;
  t.amount += amount;
  m.set(key, t);
}

const sorted = <K,>(m: Map<K, { count: number; amount: number }>) =>
  [...m.entries()].map(([name, t]) => ({ name, ...t })).sort((a, b) => b.amount - a.amount);

/**
 * Everything on the Reports page for one date range. Payments and expenses
 * are fetched as rows and grouped here, which keeps time zones and
 * empty buckets simple.
 * Row fetch is ~3k payments a year; move grouping into SQL if a
 * multi-year range ever gets slow.
 *
 * For one programme everything narrows to its athletes, sessions and own
 * expenses; shop sales paid on the spot belong to no programme and are left out.
 */
export async function getReport(r: ReportRange, now = new Date(), programmeId: string | null = null) {
  const inRange = { gte: r.from, lte: r.to };
  const payments_ = inProgramme.payment(programmeId);
  const invoices_ = inProgramme.invoice(programmeId);
  const athletes_ = inProgramme.athlete(programmeId);
  // Cash shop sales: none under one programme
  const sales_ = programmeId ? { id: { in: [] as string[] } } : {};
  const label = await batchLabeller();
  const batchSelect = { select: { name: true, programme: { select: { name: true } } } } as const;
  const lastYear = { gte: subYears(r.from, 1), lte: subYears(r.to, 1) };
  const previousRange = { gte: r.prevFrom, lte: r.prevTo };

  const [payments, sales, lastYearPayments, lastYearSales, prevIncome, expenses, billed, open, sessions, attendance, joined, squad] =
    await Promise.all([
      db.finance.findMany({
        where: { isArchived: false, paymentDate: inRange, ...payments_ },
        select: {
          amountPaid: true,
          paymentDate: true,
          paymentType: true,
          invoice: { select: { type: true } },
          athlete: { select: { batches: batchSelect } },
        },
      }),
      // Shop sales paid on the spot; those charged to an account count when the invoice is paid
      db.sale.findMany({ where: { status: "PAID", createdAt: inRange, ...sales_ }, select: { total: true, createdAt: true } }),
      db.finance.findMany({ where: { isArchived: false, paymentDate: lastYear, ...payments_ }, select: { amountPaid: true, paymentDate: true } }),
      db.sale.findMany({ where: { status: "PAID", createdAt: lastYear, ...sales_ }, select: { total: true, createdAt: true } }),
      Promise.all([
        db.finance.aggregate({ where: { isArchived: false, paymentDate: previousRange, ...payments_ }, _sum: { amountPaid: true } }),
        db.sale.aggregate({ where: { status: "PAID", createdAt: previousRange, ...sales_ }, _sum: { total: true } }),
      ]),
      db.expenses.findMany({
        where: { isArchived: false, date: inRange, ...inProgramme.expense(programmeId) },
        select: { amount: true, date: true, category: { select: { name: true } }, programme: { select: { name: true } } },
      }),
      db.invoice.aggregate({
        where: { status: { not: "CANCELED" }, createdAt: inRange, ...invoices_ },
        _sum: { amountDue: true, discount: true },
        _count: { _all: true },
      }),
      // Unpaid fees are as of today, whatever the range
      db.invoice.findMany({
        where: { status: { in: [...OPEN] }, ...invoices_ },
        select: {
          amountDue: true,
          discount: true,
          amountPaid: true,
          dueDate: true,
          athlete: {
            select: {
              athleteId: true,
              firstName: true,
              middleName: true,
              lastName: true,
              batches: batchSelect,
            },
          },
        },
      }),
      db.training.findMany({
        where: { isArchived: false, date: { gte: r.from, lte: r.to < now ? r.to : now }, ...inProgramme.session(programmeId) },
        select: { id: true, batch: batchSelect, _count: { select: { athletes: true } } },
      }),
      db.attendance.groupBy({
        by: ["trainingId", "status"],
        where: { training: { isArchived: false, date: { gte: r.from, lte: r.to < now ? r.to : now }, ...inProgramme.session(programmeId) } },
        _count: { _all: true },
      }),
      db.athlete.findMany({
        where: { isArchived: false, createdAt: inRange, ...athletes_ },
        select: { batches: batchSelect },
      }),
      db.athlete.groupBy({ by: ["status"], where: { isArchived: false, ...athletes_ }, _count: { _all: true } }),
    ]);

  // ---- Programmes side by side (all programmes), or the costs shared with the others (one)
  const [programmes, activeByBatch, shared] = await Promise.all([
    programmeId ? [] : db.programme.findMany({ where: { isArchived: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true } }),
    programmeId
      ? []
      : db.athlete.groupBy({ by: ["batchesId"], where: { isArchived: false, status: "ACTIVE" }, _count: { _all: true } }),
    programmeId
      ? db.expenses.aggregate({ where: { isArchived: false, date: inRange, programmeId: null }, _sum: { amount: true }, _count: { _all: true } })
      : null,
  ]);
  const programmeOfBatch = programmeId
    ? new Map<string, string>()
    : new Map(
        (await db.batches.findMany({ select: { id: true, programme: { select: { name: true } } } })).map((b) => [b.id, b.programme.name]),
      );

  // ---- Money in and out
  const keys = bucketKeys(r);
  const trend = new Map(keys.map((k) => [k.key, { ...k, fees: 0, shop: 0, collected: 0, spent: 0, lastYear: 0 }]));
  const byBatch = new Map<string, { count: number; amount: number }>();
  const byMethod = new Map<string, { count: number; amount: number }>();
  const bySource = new Map<string, { count: number; amount: number }>([
    ["Fees", { count: 0, amount: 0 }],
    ["Shop", { count: 0, amount: 0 }],
  ]);
  let fees = 0;
  let shop = 0;
  for (const p of payments) {
    const t = trend.get(bucketOf(p.paymentDate, r));
    if (p.invoice?.type === "ITEM_PURCHASE") {
      shop += p.amountPaid;
      if (t) t.shop += p.amountPaid;
      tally(bySource, "Shop", p.amountPaid);
      continue;
    }
    fees += p.amountPaid;
    if (t) t.fees += p.amountPaid;
    tally(byBatch, label(p.athlete.batches, NO_BATCH), p.amountPaid);
    tally(byMethod, METHOD_LABEL[p.paymentType], p.amountPaid);
    tally(bySource, "Fees", p.amountPaid);
  }
  for (const x of sales) {
    const amount = Number(x.total);
    shop += amount;
    const t = trend.get(bucketOf(x.createdAt, r));
    if (t) t.shop += amount;
    tally(bySource, "Shop", amount);
  }
  // The same days a year earlier, on this range's buckets
  let lastYearIncome = 0;
  for (const [date, amount] of [...lastYearPayments.map((p) => [p.paymentDate, p.amountPaid] as const), ...lastYearSales.map((x) => [x.createdAt, Number(x.total)] as const)]) {
    lastYearIncome += amount;
    const t = trend.get(bucketOf(addYears(date, 1), r));
    if (t) t.lastYear += amount;
  }
  for (const t of trend.values()) t.collected = t.fees + t.shop;
  const collected = fees + shop;

  const byCategory = new Map<string, { count: number; amount: number }>();
  let spent = 0;
  for (const e of expenses) {
    spent += e.amount;
    const t = trend.get(bucketOf(e.date, r));
    if (t) t.spent += e.amount;
    tally(byCategory, e.category.name, e.amount);
  }

  const previous = (prevIncome[0]._sum.amountPaid ?? 0) + Number(prevIncome[1]._sum.total ?? 0);

  // ---- Unpaid fees, by how late they are
  const AGES = [
    { label: "Not yet due", max: 0 },
    { label: "1–30 days late", max: 30 },
    { label: "31–60 days late", max: 60 },
    { label: "61–90 days late", max: 90 },
    { label: "Over 90 days late", max: Infinity },
  ];
  const aging = AGES.map((a) => ({ label: a.label, count: 0, amount: 0 }));
  const debtors = new Map<string, { id: string; name: string; batch: string; owed: number; invoices: number; oldest: Date }>();
  const today = startOfDay(now);
  for (const inv of open) {
    const owed = invoiceBalance(inv);
    if (!owed) continue;
    const late = differenceInCalendarDays(today, inv.dueDate);
    const bucket = aging[AGES.findIndex((a) => late <= a.max)];
    bucket.count += 1;
    bucket.amount += owed;

    const a = inv.athlete;
    const d = debtors.get(a.athleteId) ?? {
      id: a.athleteId,
      name: athleteName(a),
      batch: label(a.batches, NO_BATCH),
      owed: 0,
      invoices: 0,
      oldest: inv.dueDate,
    };
    d.owed += owed;
    d.invoices += 1;
    if (inv.dueDate < d.oldest) d.oldest = inv.dueDate;
    debtors.set(a.athleteId, d);
  }
  const owedTotal = aging.reduce((s, a) => s + a.amount, 0);
  const owedLate = owedTotal - aging[0].amount;

  // ---- Training: sessions held, attendance taken, turnout
  const marks = new Map<string, { marked: number; present: number }>();
  for (const a of attendance) {
    const m = marks.get(a.trainingId) ?? { marked: 0, present: 0 };
    m.marked += a._count._all;
    if (a.status === "PRESENT" || a.status === "LATE") m.present += a._count._all;
    marks.set(a.trainingId, m);
  }
  const training = new Map<string, { sessions: number; recorded: number; marked: number; present: number }>();
  for (const s of sessions) {
    const name = label(s.batch, NO_BATCH);
    const t = training.get(name) ?? { sessions: 0, recorded: 0, marked: 0, present: 0 };
    const m = marks.get(s.id);
    t.sessions += 1;
    if (m) {
      t.recorded += 1;
      t.marked += m.marked;
      t.present += m.present;
    }
    training.set(name, t);
  }
  const trainingRows = [...training.entries()]
    .map(([name, t]) => ({ name, ...t }))
    .sort((a, b) => b.sessions - a.sessions);
  const sum = (k: "sessions" | "recorded" | "marked" | "present") =>
    trainingRows.reduce((s, t) => s + t[k], 0);

  // ---- Squad
  const joinedByBatch = new Map<string, { count: number; amount: number }>();
  for (const a of joined) tally(joinedByBatch, label(a.batches, NO_BATCH), 0);
  const status = Object.fromEntries(squad.map((s) => [s.status, s._count._all]));

  type ProgrammeRow = { name: string; fees: number; spent: number; owed: number; athletes: number; marked: number; present: number };
  const byProgramme = new Map<string, ProgrammeRow>(
    programmes.map((p) => [p.name, { name: p.name, fees: 0, spent: 0, owed: 0, athletes: 0, marked: 0, present: 0 }]),
  );
  const row = (name: string | undefined) => (name ? byProgramme.get(name) : undefined);
  if (!programmeId) {
    for (const p of payments) {
      const r = row(p.athlete.batches?.programme.name);
      if (r && p.invoice?.type !== "ITEM_PURCHASE") r.fees += p.amountPaid;
    }
    for (const e of expenses) {
      const r = row(e.programme?.name);
      if (r) r.spent += e.amount;
    }
    for (const inv of open) {
      const r = row(inv.athlete.batches?.programme.name);
      if (r) r.owed += invoiceBalance(inv);
    }
    for (const a of activeByBatch) {
      const r = row(programmeOfBatch.get(a.batchesId));
      if (r) r.athletes += a._count._all;
    }
    for (const x of sessions) {
      const r = row(x.batch?.programme.name);
      const m = marks.get(x.id);
      if (r && m) {
        r.marked += m.marked;
        r.present += m.present;
      }
    }
  }
  const sharedSpent = expenses.filter((e) => !e.programme).reduce((n, e) => n + e.amount, 0);

  return {
    /** Under all programmes, one row each (shown when there are two or more) */
    programmes: {
      rows: [...byProgramme.values()],
      /** Expenses not charged to a programme */
      shared: sharedSpent,
    },
    money: {
      collected,
      fees,
      shop,
      payments: payments.length,
      sales: sales.length,
      previous,
      change: previous ? (collected - previous) / previous : null,
      lastYear: lastYearIncome,
      changeYear: lastYearIncome ? (collected - lastYearIncome) / lastYearIncome : null,
      spent,
      net: collected - spent,
      /** Under one programme: expenses shared by all, not in spent or net */
      sharedSpent: shared ? (shared._sum.amount ?? 0) : 0,
      sharedCount: shared ? shared._count._all : 0,
      billed: Number(billed._sum.amountDue ?? 0) - Number(billed._sum.discount ?? 0),
      invoicesIssued: billed._count._all,
      trend: [...trend.values()],
      byBatch: sorted(byBatch),
      byMethod: sorted(byMethod),
      byCategory: sorted(byCategory),
      bySource: [...bySource.entries()].map(([name, t]) => ({ name, ...t })),
    },
    unpaid: {
      total: owedTotal,
      late: owedLate,
      aging,
      top: [...debtors.values()].sort((a, b) => b.owed - a.owed).slice(0, 10),
      athletes: debtors.size,
    },
    training: {
      rows: trainingRows,
      sessions: sum("sessions"),
      recorded: sum("recorded"),
      marked: sum("marked"),
      present: sum("present"),
    },
    squad: {
      joined: joined.length,
      joinedByBatch: [...joinedByBatch.entries()]
        .map(([name, t]) => ({ name, count: t.count }))
        .sort((a, b) => b.count - a.count),
      active: status.ACTIVE ?? 0,
      pending: status.PENDING ?? 0,
      inactive: (status.DEACTIVATED ?? 0) + (status.DEFAULT ?? 0),
    },
  };
}

export type Report = Awaited<ReturnType<typeof getReport>>;
