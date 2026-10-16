import { Prisma } from "@/generated/prisma/client";
import { PHOTO_SELECT } from "@/features/athletes/lib/photo";

export const GuardiansQuery = {
  include: {
    athlete: {
      select: {
        firstName: true,
        lastName: true,
        middleName: true,
        ...PHOTO_SELECT,
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
