import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { athleteName } from "@/features/athletes/lib/names";
import { COUPON_LIST_SELECT, toCouponRow } from "@/features/coupons/queries/list";
import { couponInvoices } from "@/features/coupons/queries/usage";
import { CouponDetails } from "@/features/coupons/components/CouponDetails";

export const metadata: Metadata = { title: "Coupon" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.coupon.findUnique({ where: { id }, select: COUPON_LIST_SELECT });
  if (!c) notFound();
  const [invoices, given, redemptions, history] = await Promise.all([
    couponInvoices(id),
    db.invoiceDiscount.aggregate({ where: { kind: "COUPON", redemption: { couponId: id }, invoice: { status: { not: "CANCELED" } } }, _sum: { amount: true } }),
    // Athletes it was given to (not the ones put on a single invoice)
    db.couponRedemption.findMany({
      where: { couponId: id, invoiceId: null },
      select: {
        id: true,
        athleteId: true,
        status: true,
        invoicesLeft: true,
        createdAt: true,
        athlete: { select: { firstName: true, middleName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.auditLog.findMany({
      where: { recordId: id, action: { notIn: ["VIEW", "EXPORT", "EXPORT_PDF"] } },
      select: { id: true, details: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return (
    <CouponDetails
      coupon={toCouponRow(c)}
      invoices={invoices}
      given={Number(given._sum.amount ?? 0)}
      athletes={redemptions.map((r) => ({ id: r.id, athleteId: r.athleteId, name: athleteName(r.athlete), status: r.status, invoicesLeft: r.invoicesLeft, createdAt: r.createdAt.toISOString() }))}
      history={history.map((h) => ({ id: h.id, details: h.details, createdAt: h.createdAt.toISOString(), user: h.user?.name ?? null }))}
    />
  );
}
