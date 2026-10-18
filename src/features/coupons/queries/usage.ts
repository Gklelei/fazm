import "server-only";
import { db } from "@/lib/prisma";
import { cursorArgs, pageOf } from "@/lib/cursor";

export type CouponInvoice = {
  id: string;
  invoiceNumber: string;
  athlete: { athleteId: string; firstName: string; middleName: string | null; lastName: string };
  discount: number;
  status: string;
  createdAt: string;
};
export type CouponInvoicesPage = { items: CouponInvoice[]; nextCursor: string | null; total?: number };

const PAGE = 25;

/** Invoices the coupon discounted, newest first. */
export async function couponInvoices(couponId: string, cursor?: string | null): Promise<CouponInvoicesPage> {
  const where = { couponId };
  const [rows, total] = await Promise.all([
    db.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        discount: true,
        status: true,
        createdAt: true,
        athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorArgs(cursor, PAGE),
    }),
    cursor ? undefined : db.invoice.count({ where }),
  ]);
  const { items, nextCursor } = pageOf(rows, PAGE);
  return {
    items: items.map((r) => ({ ...r, discount: Number(r.discount ?? 0), createdAt: r.createdAt.toISOString() })),
    nextCursor,
    total,
  };
}
