import { db } from "@/lib/prisma";
import {
  GetCouponsQuery,
  GetCouponsQueryType,
} from "@/Modules/Coupons/Types/Index";
import Coupons from "@/Modules/Coupons/ui/Coupons";

const page = async () => {
  const coupons = await db.coupon.findMany({
    ...GetCouponsQuery,
    where: { status: 1, voided: 0 },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <Coupons coupons={coupons} />;
};

export default page;
