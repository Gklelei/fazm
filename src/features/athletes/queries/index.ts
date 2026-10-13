import { Prisma } from "@/generated/prisma/client";

export const GetAthleteByIdQuery = (id: string) =>
  ({
    where: {
      athleteId: id,
    },
    include: {
      address: true,
      emergencyContacts: true,
      guardians: true,
      medical: true,
      finances: { where: { isArchived: false }, orderBy: { paymentDate: "desc" } },
      athleteSubscriptions: {
        where: {
          status: "ACTIVE",
        },
        include: {
          coupon: true,
          subscriptionPlan: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: {
          subscriptionPlan: true,
        },
      },
      assessments: {
        include: {
          coach: true,

          responses: {
            include: {
              metric: true,
            },
          },
          training: true,
        },
      },
      batches: { select: { id: true, name: true } },
    },
  }) satisfies Prisma.AthleteFindUniqueArgs;

export type GetAthleteByIdQueryType = Prisma.AthleteGetPayload<
  ReturnType<typeof GetAthleteByIdQuery>
>;
