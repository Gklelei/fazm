import { db } from "@/lib/prisma";
import {
  GetCouponsQuery,
  GetCouponsQueryType,
} from "@/Modules/Coupons/Types/Index";
import Coupons from "@/Modules/Coupons/ui/Coupons";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [coupons, total] = await db.$transaction([
    db.coupon.findMany({
      ...GetCouponsQuery,
      where: { status: 1, voided: 0 },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),
    db.coupon.count({ where: { status: 1, voided: 0 } }),
  ]);

  return <Coupons coupons={coupons} page={page} limit={limit} total={total} />;
}
