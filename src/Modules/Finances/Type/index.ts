import { Prisma } from "@/generated/prisma/client";
import { InvoiceFindManyArgs } from "@/generated/prisma/models";

export const GetFinancesQuery = {
  orderBy: {
    createdAt: "desc",
  },
  include: {
    athlete: {
      select: {
        firstName: true,
        lastName: true,
        profilePIcture: true,
      },
    },
    invoice: true,
  },
} satisfies Prisma.FinanceFindManyArgs;

export const GetAllFinanceAtheletes = {
  select: {
    athleteId: true,
    firstName: true,
    lastName: true,
  },
} satisfies Prisma.AthleteFindManyArgs;

export const FetchAllInvoicesQuery = {
  where: {
    status: {
      in: ["OVERDUE", "PARTIAL", "PENDING"] as const,
    },
  },
  include: {
    athlete: true,
    athleteSubscription: true,
    finances: true,
    subscriptionPlan: true,
  },
} satisfies InvoiceFindManyArgs;
export type FinancesTypes = Prisma.FinanceGetPayload<typeof GetFinancesQuery>;
export type GetAllFinanceAtheletesType = Prisma.AthleteGetPayload<
  typeof GetAllFinanceAtheletes
>;
export type GetAllInvoicesType = Prisma.InvoiceGetPayload<
  typeof FetchAllInvoicesQuery
>;
