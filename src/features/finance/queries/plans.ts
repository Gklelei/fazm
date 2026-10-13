import { Prisma } from "@/generated/prisma/client";

export const GetAllSubsQuery = {
  where: {
    isArchived: false,
  },
  include: {
    activeSubscriptions: true,
    invoices: true,
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

export type GetAllSubsQueryType = Prisma.SubscriptionPlanGetPayload<
  typeof GetAllSubsQuery
>;

export type GetSubByIdQueryType = Prisma.SubscriptionPlanGetPayload<
  ReturnType<typeof GetSubByIdQuery>
>;
