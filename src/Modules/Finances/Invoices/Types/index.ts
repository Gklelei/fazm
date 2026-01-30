import { Prisma } from "@/generated/prisma/client";

export const getInvoicesQuery = {
  orderBy: {
    createdAt: "desc",
  },
  include: {
    athlete: {
      select: {
        athleteId: true,
        firstName: true,
        lastName: true,
        middleName: true,
      },
    },
    subscriptionPlan: {
      select: {
        name: true,
        code: true,
        description: true,
      },
    },
  },
} satisfies Prisma.InvoiceFindManyArgs;

export const ViewInvoiceQuery = (id: string) =>
  ({
    where: {
      id: id,
    },
    include: {
      athlete: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      subscriptionPlan: {
        select: {
          code: true,
          name: true,
          description: true,
        },
      },
    },
  }) satisfies Prisma.InvoiceFindUniqueArgs;

export const EditInvoiceQuery = (id: string) =>
  ({
    where: {
      invoiceNumber: id,
    },
    include: {
      athlete: true,
      athleteSubscription: true,
      finances: true,
      subscriptionPlan: true,
    },
  }) satisfies Prisma.InvoiceFindUniqueArgs;

export const AllAthletesIDQuery = {
  select: {
    athleteId: true,
    firstName: true,
    lastName: true,
    batches: {
      select: {
        name: true,
      },
    },
  },
} satisfies Prisma.AthleteFindManyArgs;

export type AllInvoicesType = Prisma.InvoiceGetPayload<typeof getInvoicesQuery>;

export type InvoiceType = Prisma.InvoiceGetPayload<
  ReturnType<typeof ViewInvoiceQuery>
>;

export type InvoiceEditType = Prisma.InvoiceGetPayload<
  ReturnType<typeof EditInvoiceQuery>
>;
export type AllAthletesIDQueryType = Prisma.AthleteGetPayload<
  typeof AllAthletesIDQuery
>;
