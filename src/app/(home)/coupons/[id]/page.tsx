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
  const [invoices, given, subs, history] = await Promise.all([
    couponInvoices(id),
    db.invoice.aggregate({ where: { couponId: id }, _sum: { discount: true } }),
    db.athleteSubscription.findMany({
      where: { couponId: id, status: "ACTIVE" },
      select: {
        id: true,
        athleteId: true,
        subscriptionPlan: { select: { name: true } },
        athlete: { select: { firstName: true, middleName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
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
      given={Number(given._sum.discount ?? 0)}
      feePlans={subs.map((s) => ({ id: s.id, athleteId: s.athleteId, name: athleteName(s.athlete), plan: s.subscriptionPlan.name }))}
      history={history.map((h) => ({ id: h.id, details: h.details, createdAt: h.createdAt.toISOString(), user: h.user?.name ?? null }))}
    />
  );
}
