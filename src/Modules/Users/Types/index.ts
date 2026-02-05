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
      finances: true,
      invoices: {
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
      trainings: true,
      attendances: {
        include: {
          reason: true,
          training: {
            select: {
              attendances: true,
            },
          },
        },
      },
    },
  }) satisfies Prisma.AthleteFindUniqueArgs;

export type GetAthleteByIdQueryType = Prisma.AthleteGetPayload<
  ReturnType<typeof GetAthleteByIdQuery>
>;
