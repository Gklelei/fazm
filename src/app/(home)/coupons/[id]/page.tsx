import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetCouponsByIdQuery } from "@/features/coupons/queries";
import CreateCoupons from "@/features/coupons/components/CouponForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Coupon Details" };

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const coupon = await db.coupon.findUnique(GetCouponsByIdQuery(id));
  if (!coupon) return <NotFound />;
  return <CreateCoupons coupon={coupon} id={id} />;
};

export default page;
