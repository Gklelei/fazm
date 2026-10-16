import { Prisma } from "@/generated/prisma/client";
import { PHOTO_SELECT } from "@/features/athletes/lib/photo";

/** Everything the attendance sheet needs for one session. */
export const GetTrainingAthletesQuery = (id: string) =>
  ({
    where: { id },
    select: {
      id: true,
      name: true,
      date: true,
      duration: true,
      batch: { select: { name: true } },
      location: { select: { name: true } },
      coach: { select: { staffId: true, fullNames: true } },
      athletes: {
        where: { isArchived: false },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          athleteId: true,
          firstName: true,
          lastName: true,
          ...PHOTO_SELECT,
        },
      },
      attendances: {
        select: { athleteId: true, status: true, reasonId: true },
      },
    },
  }) satisfies Prisma.trainingFindUniqueArgs;

export type TrainingAttendanceType = Prisma.trainingGetPayload<
  ReturnType<typeof GetTrainingAthletesQuery>
>;
