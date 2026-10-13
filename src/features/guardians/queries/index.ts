import { Prisma } from "@/generated/prisma/client";

export const GuardiansQuery = {
  include: {
    athlete: {
      select: {
        firstName: true,
        lastName: true,
        middleName: true,
        profilePIcture: true,
        batches: {
          select: {
            name: true,
          },
        },
      },
    },
  },
} satisfies Prisma.AthleteGuardianFindManyArgs;

export type GuardiansResponseType = Prisma.AthleteGuardianGetPayload<
  typeof GuardiansQuery
>;
