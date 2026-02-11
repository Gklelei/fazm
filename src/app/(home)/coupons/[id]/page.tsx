import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import { GetCouponsByIdQuery } from "@/Modules/Coupons/Types/Index";
import CreateCoupons from "@/Modules/Coupons/ui/CreateCoupons";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const coupon = await db.coupon.findUnique(GetCouponsByIdQuery(id));
  if (!coupon) return <NotFound />;
  return <CreateCoupons coupon={coupon} id={id} />;
};

export default page;
