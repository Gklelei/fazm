import "server-only";
import { endOfDay, isValid, parse, startOfDay } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { METHOD_LABEL } from "@/features/finance/lib/methods";
import { athleteName } from "@/features/athletes/lib/names";
import { inProgramme } from "@/lib/programme-scope";
import { batchIdsFor } from "../lib/batch-label";

export const SERIES = ["fees", "shop", "income", "spent"] as const;
export type Series = (typeof SERIES)[number];
export type DrillQuery = { series: Series; from: string; to: string; batch?: string; method?: string; category?: string };
export type DrillRecord = { id: string; date: string; title: string; detail: string; amount: number; href: string | null; source: string };

const LIMIT = 300;
const NO_BATCH = "No batch";
const day = (s: string) => {
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
};

export function drillFromParams(sp: URLSearchParams): DrillQuery | null {
  const series = SERIES.find((x) => x === sp.get("series"));
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  if (!series || !day(from) || !day(to)) return null;
  const opt = (k: string) => sp.get(k)?.slice(0, 80) || undefined;
  return { series, from, to, batch: opt("batch"), method: opt("method"), category: opt("category") };
}

/**
 * The records behind one bar or row of the Reports page, matching how
 * getReport counts them: payments by payment date (shop invoices count as
 * shop), paid shop sales by sale date, expenses by date.
 * The header's programme narrows them the same way too.
 */
export async function drillRecords(q: DrillQuery, programmeId: string | null = null) {
  const range = { gte: startOfDay(day(q.from)!), lte: endOfDay(day(q.to)!) };
  // "U13" or "Girls U13", as the report labelled the row
  const batchIds = q.batch && q.batch !== NO_BATCH ? await batchIdsFor(q.batch) : null;
  const rows: DrillRecord[] = [];

  if (q.series !== "spent") {
    const method = q.method ? (Object.entries(METHOD_LABEL).find(([, l]) => l === q.method)?.[0] as Prisma.FinanceWhereInput["paymentType"]) : undefined;
    const kind: Prisma.FinanceWhereInput =
      q.series === "fees" ? { OR: [{ invoiceId: null }, { invoice: { type: { not: "ITEM_PURCHASE" } } }] } : q.series === "shop" ? { invoice: { type: "ITEM_PURCHASE" } } : {};
    const payments = await db.finance.findMany({
      where: {
        isArchived: false,
        paymentDate: range,
        ...kind,
        ...(method && { paymentType: method }),
        AND: [
          inProgramme.payment(programmeId),
          q.batch ? { athlete: batchIds ? { batchesId: { in: batchIds } } : { batches: { is: null } } } : {},
        ],
      },
      select: {
        id: true,
        amountPaid: true,
        paymentDate: true,
        paymentType: true,
        receiptNumber: true,
        invoice: { select: { invoiceNumber: true, type: true } },
        athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
      },
      orderBy: { paymentDate: "desc" },
      take: LIMIT + 1,
    });
    for (const p of payments)
      rows.push({
        id: p.id,
        date: p.paymentDate.toISOString(),
        title: athleteName(p.athlete),
        detail: [p.receiptNumber, METHOD_LABEL[p.paymentType], p.invoice?.invoiceNumber].filter(Boolean).join(" · "),
        amount: p.amountPaid,
        href: p.invoice ? `/invoices/${p.invoice.invoiceNumber}` : `/players/user-profile/${p.athlete.athleteId}`,
        source: p.invoice?.type === "ITEM_PURCHASE" ? "Shop invoice payment" : "Payment",
      });

    // Cash shop sales belong to no programme
    if (q.series !== "fees" && !q.batch && !q.method && !programmeId) {
      const sales = await db.sale.findMany({
        where: { status: "PAID", createdAt: range },
        select: { id: true, saleNumber: true, createdAt: true, total: true, paymentType: true, customerName: true, athlete: { select: { firstName: true, middleName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: LIMIT + 1,
      });
      for (const x of sales)
        rows.push({
          id: x.id,
          date: x.createdAt.toISOString(),
          title: x.athlete ? athleteName(x.athlete) : (x.customerName ?? "Walk-in"),
          detail: [x.saleNumber, x.paymentType === "CASH" ? "Cash" : "M-Pesa"].join(" · "),
          amount: Number(x.total),
          href: `/shop/sales/${x.saleNumber}`,
          source: "Shop sale",
        });
    }
  } else {
    const expenses = await db.expenses.findMany({
      where: { isArchived: false, date: range, ...inProgramme.expense(programmeId), ...(q.category && { category: { name: q.category } }) },
      select: { id: true, name: true, description: true, amount: true, date: true, category: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: LIMIT + 1,
    });
    for (const e of expenses)
      rows.push({ id: e.id, date: e.date.toISOString(), title: e.name, detail: [e.category.name, e.description].filter(Boolean).join(" · "), amount: e.amount, href: "/expenses", source: "Expense" });
  }

  rows.sort((a, b) => b.date.localeCompare(a.date));
  return { rows: rows.slice(0, LIMIT), more: rows.length > LIMIT, total: rows.reduce((s, r) => s + r.amount, 0) };
}
export type DrillResult = Awaited<ReturnType<typeof drillRecords>>;
