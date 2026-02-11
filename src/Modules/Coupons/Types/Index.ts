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
