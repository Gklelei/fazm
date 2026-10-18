import type { Metadata } from "next";
import { listCoupons } from "@/features/coupons/queries/list";
import { CouponsList } from "@/features/coupons/components/CouponsList";

export const metadata: Metadata = { title: "Coupons" };

export default async function Page() {
  return <CouponsList initial={await listCoupons({})} />;
}
