import { Prisma } from "@/generated/prisma/client";

export const GetTrainingAthletesQuery = (id: string) =>
  ({
    where: {
      id,
    },
    include: {
      coach: {
        select: {
          staffId: true,
        },
      },
      athletes: {
        where: {
          isArchived: false,
        },
        select: {
          athleteId: true,
          firstName: true,
          lastName: true,
        },
      },
      attendances: {
        where: {
          trainingId: id,
        },
        select: {
          athleteId: true,
          reason: true,
          status: true,
        },
      },
    },
  }) satisfies Prisma.trainingFindManyArgs;

export type TrainingAttendanceType = Prisma.trainingGetPayload<
  ReturnType<typeof GetTrainingAthletesQuery>
>;
