import { Prisma } from "@/generated/prisma/client";
import { trainingFindUniqueArgs } from "@/generated/prisma/models";

export const GetAllTrainingSessionsQuery = {
  include: {
    batch: { select: { id: true, name: true } },
    coach: {
      include: {
        user: { select: { id: true, role: true } },
      },
    },
    location: true,
    _count: true,
  },
} satisfies Prisma.trainingFindManyArgs;

export const GetAllTrainingSessionsByIdQuery = (id: string) =>
  ({
    where: {
      id,
    },
    include: {
      assessments: {
        include: {
          responses: true,
        },
      },
      athletes: {
        where: { isArchived: false },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      },
      attendances: { include: { reason: true } },
      batch: true,
      drills: true,
      coach: true,
      location: true,
    },
  }) satisfies Prisma.trainingFindUniqueArgs;

export const GetTrainingById = (id: string) =>
  ({
    where: {
      id,
    },
    include: {
      athletes: true,
      batch: true,
      drills: true,
      coach: true,
    },
  }) satisfies trainingFindUniqueArgs;

export type GetTrainingByIdType = Prisma.trainingGetPayload<
  ReturnType<typeof GetTrainingById>
>;

export type GetAllTrainingSessionsByIdQueryType = Prisma.trainingGetPayload<
  ReturnType<typeof GetAllTrainingSessionsByIdQuery>
>;

export type GetAllTrainingSessionsQueryType = Prisma.trainingGetPayload<
  typeof GetAllTrainingSessionsQuery
>;
