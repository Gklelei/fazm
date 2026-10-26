import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { academyDate } from "@/lib/academy-time";
import { PageHeader } from "@/components/shared/PageHeader";
import { CouponForm } from "@/features/coupons/components/CouponForm";

export const metadata: Metadata = { title: "Edit coupon" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.coupon.findUnique({
    where: { id },
    include: { plans: { select: { id: true } }, _count: { select: { redemptions: { where: { status: { not: "REMOVED" } } } } } },
  });
  if (!c) notFound();
  if (c.voided) redirect(`/coupons/${id}`);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={<span className="font-mono normal-case">Edit {c.name}</span>} />
      <CouponForm
        id={id}
        uses={c._count.redemptions}
        values={{
          name: c.name,
          discountType: c.discountType,
          value: Number(c.value),
          duration: c.duration,
          durationCount: c.durationCount != null ? String(c.durationCount) : "",
          startDate: academyDate(c.startDate),
          expiryDate: c.expiryDate ? academyDate(c.expiryDate) : "",
          usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
          oncePerAthlete: c.oncePerAthlete,
          plans: c.plans.map((p) => p.id),
        }}
      />
    </div>
  );
}
