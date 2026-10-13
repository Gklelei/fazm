import type { Prisma } from "@/generated/prisma/client";
import { PAYMENT_TYPE } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";

export type PaymentParams = {
  search: string;
  method: PAYMENT_TYPE | "";
  from: string;
  to: string;
  page: number;
  pageSize: number;
};

export function parsePaymentParams(sp: Record<string, string | undefined>): PaymentParams {
  const page = Number(sp.page);
  return {
    search: (sp.search ?? "").trim(),
    method: sp.method && sp.method in PAYMENT_TYPE ? (sp.method as PAYMENT_TYPE) : "",
    from: sp.from ?? "",
    to: sp.to ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: 25,
  };
}

const PAYMENT_ROW_SELECT = {
  id: true,
  amountPaid: true,
  paymentDate: true,
  paymentType: true,
  receiptNumber: true,
  collectedBy: true,
  notes: true,
  athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
} satisfies Prisma.FinanceSelect;

export type PaymentRow = Prisma.FinanceGetPayload<{ select: typeof PAYMENT_ROW_SELECT }>;

export async function listPayments(p: PaymentParams) {
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const paymentDate: Prisma.DateTimeFilter = {};
  if (p.from) paymentDate.gte = new Date(`${p.from}T00:00:00`);
  if (p.to) paymentDate.lte = new Date(`${p.to}T23:59:59.999`);

  const where: Prisma.FinanceWhereInput = {
    isArchived: false,
    ...(p.method ? { paymentType: p.method } : {}),
    ...(p.from || p.to ? { paymentDate } : {}),
    ...(p.search
      ? {
          AND: p.search.split(/\s+/).map((t) => ({
            OR: [
              { receiptNumber: ci(t) },
              { notes: ci(t) },
              { athleteId: ci(t) },
              { athlete: { firstName: ci(t) } },
              { athlete: { lastName: ci(t) } },
              { invoice: { invoiceNumber: ci(t) } },
            ],
          })),
        }
      : {}),
  };

  const [rows, totals] = await Promise.all([
    db.finance.findMany({
      where,
      select: PAYMENT_ROW_SELECT,
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: p.pageSize,
      skip: (p.page - 1) * p.pageSize,
    }),
    db.finance.aggregate({ where, _count: { _all: true }, _sum: { amountPaid: true } }),
  ]);

  const total = totals._count._all;
  return {
    rows,
    total,
    sum: totals._sum.amountPaid ?? 0,
    pages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
