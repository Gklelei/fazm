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

/** Invoices the coupon discounted, newest first (one row per discount line). */
export async function couponInvoices(couponId: string, cursor?: string | null): Promise<CouponInvoicesPage> {
  const where = { kind: "COUPON" as const, redemption: { couponId } };
  const [rows, total] = await Promise.all([
    db.invoiceDiscount.findMany({
      where,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        invoice: {
          select: {
            invoiceNumber: true,
            status: true,
            athlete: { select: { athleteId: true, firstName: true, middleName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorArgs(cursor, PAGE),
    }),
    cursor ? undefined : db.invoiceDiscount.count({ where }),
  ]);
  const { items, nextCursor } = pageOf(rows, PAGE);
  return {
    items: items.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice.invoiceNumber,
      athlete: r.invoice.athlete,
      discount: Number(r.amount),
      status: r.invoice.status,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor,
    total,
  };
}
