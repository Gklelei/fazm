import { Prisma } from "@/generated/prisma/client";

export const GetCouponsQuery = {} satisfies Prisma.CouponFindManyArgs;

export type GetCouponsQueryType = Prisma.CouponGetPayload<
  typeof GetCouponsQuery
>;

export const GetCouponsByIdQuery = (id: string) =>
  ({
    where: {
      id,
    },
    include: {
      _count: true,
    },
  }) satisfies Prisma.CouponFindUniqueArgs;

export type GetCouponsByIdQueryType = Prisma.CouponGetPayload<
  ReturnType<typeof GetCouponsByIdQuery>
>;

export const GetCoupons = {} satisfies Prisma.CouponFindManyArgs;

// Active coupon as offered on the athlete profile (raw SQL row, normalized).
export type AthleteCouponOption = {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number; // UI-friendly
  interval: "ONCE" | "REPEATING";
  startDate: Date;
  expiryDate: Date | null;
  usageLimit: number | null;
  timesUsed: number;
  status: number;
  voided: number;
};
