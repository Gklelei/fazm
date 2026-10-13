import type { Prisma } from "@/generated/prisma/client";
import { INVOICE_STATUS } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";

export type InvoiceFilters = {
  search?: string;
  athleteId?: string;
  /** Only invoices that can still take a payment */
  open?: boolean;
  status?: INVOICE_STATUS;
  /** Issue date range, inclusive, YYYY-MM-DD */
  from?: string;
  to?: string;
};

export function invoiceFiltersFromParams(sp: URLSearchParams): InvoiceFilters {
  const status = sp.get("status");
  return {
    search: sp.get("search")?.trim() || undefined,
    athleteId: sp.get("athleteId") || undefined,
    open: sp.get("open") === "1" || undefined,
    status: status && status in INVOICE_STATUS ? (status as INVOICE_STATUS) : undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  };
}

export function buildInvoiceWhere({ search, athleteId, open, status, from, to }: InvoiceFilters): Prisma.InvoiceWhereInput {
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const terms = (search ?? "").split(/\s+/).filter(Boolean);
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999`);

  return {
    ...(athleteId ? { athleteId } : {}),
    ...(status
      ? { status }
      : open
        ? { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] as INVOICE_STATUS[] } }
        : {}),
    ...(from || to ? { createdAt } : {}),
    ...(terms.length
      ? {
          AND: terms.map((t) => ({
            OR: [
              { invoiceNumber: ci(t) },
              { athlete: { firstName: ci(t) } },
              { athlete: { lastName: ci(t) } },
              { athlete: { athleteId: ci(t) } },
            ],
          })),
        }
      : {}),
  };
}

export const INVOICE_LIST_SELECT = {
  id: true,
  invoiceNumber: true,
  description: true,
  type: true,
  amountDue: true,
  amountPaid: true,
  discount: true,
  status: true,
  dueDate: true,
  createdAt: true,
  athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
  subscriptionPlan: { select: { name: true } },
} satisfies Prisma.InvoiceSelect;

type Row = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_LIST_SELECT }>;

/** Over the wire: money as numbers, dates as strings. */
export type InvoiceListRow = Omit<Row, "amountDue" | "amountPaid" | "discount" | "dueDate" | "createdAt"> & {
  amountDue: number;
  amountPaid: number;
  discount: number;
  dueDate: string;
  createdAt: string;
};

export type InvoicesPage = {
  items: InvoiceListRow[];
  nextCursor: string | null;
  /** Totals for everything matching the filters (first page only). */
  summary?: { count: number; due: number; paid: number };
};

const toRow = (r: Row): InvoiceListRow => ({
  ...r,
  amountDue: Number(r.amountDue),
  amountPaid: Number(r.amountPaid),
  discount: Number(r.discount ?? 0),
  dueDate: r.dueDate.toISOString(),
  createdAt: r.createdAt.toISOString(),
});

export async function listInvoices(
  filters: InvoiceFilters,
  { cursor, pageSize = 25 }: { cursor?: string | null; pageSize?: number } = {},
): Promise<InvoicesPage> {
  const where = buildInvoiceWhere(filters);
  const take = Math.min(Math.max(pageSize, 1), 50);

  const [rows, totals] = await Promise.all([
    db.invoice.findMany({
      where,
      select: INVOICE_LIST_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    cursor
      ? null
      : db.invoice.aggregate({
          where: { ...where, status: where.status ?? { not: "CANCELED" } },
          _count: { _all: true },
          _sum: { amountDue: true, amountPaid: true },
        }),
  ]);

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    items: page.map(toRow),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    ...(totals && {
      summary: {
        count: totals._count._all,
        due: Number(totals._sum.amountDue ?? 0),
        paid: Number(totals._sum.amountPaid ?? 0),
      },
    }),
  };
}
