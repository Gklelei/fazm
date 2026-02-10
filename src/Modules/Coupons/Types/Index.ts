import { Prisma } from "@/generated/prisma/client";

export const GetCouponsQuery = {} satisfies Prisma.CouponFindManyArgs;

export type GetCouponsQueryType = Prisma.CouponGetPayload<
  typeof GetCouponsQuery
>;
