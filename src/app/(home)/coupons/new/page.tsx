import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { CouponForm } from "@/features/coupons/components/CouponForm";

export const metadata: Metadata = { title: "New coupon" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New coupon" />
      <CouponForm />
    </div>
  );
}
