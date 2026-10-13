import { Prisma } from "@/generated/prisma/client";

export const GetAllSubsQuery = {
  where: { isArchived: false },
  select: {
    id: true,
    name: true,
    code: true,
    amount: true,
    interval: true,
    description: true,
    isActive: true,
    createdAt: true,
    _count: { select: { activeSubscriptions: true } },
  },
} satisfies Prisma.SubscriptionPlanFindManyArgs;

export const GetSubByIdQuery = (id: string) =>
  ({
    where: {
      id,
    },
    include: {
      activeSubscriptions: true,
      invoices: true,
    },
  }) satisfies Prisma.SubscriptionPlanFindUniqueArgs;

/** A plan as sent to the browser: Decimal amount converted to a number. */
export type GetAllSubsQueryType = Omit<
  Prisma.SubscriptionPlanGetPayload<typeof GetAllSubsQuery>,
  "amount"
> & { amount: number };

export type GetSubByIdQueryType = Prisma.SubscriptionPlanGetPayload<
  ReturnType<typeof GetSubByIdQuery>
>;
