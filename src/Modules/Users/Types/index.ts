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
    },
  }) satisfies Prisma.AthleteFindUniqueArgs;

export type GetAthleteByIdQueryType = Prisma.AthleteGetPayload<
  ReturnType<typeof GetAthleteByIdQuery>
>;
