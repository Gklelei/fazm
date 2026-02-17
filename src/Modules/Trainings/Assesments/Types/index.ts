import { Prisma } from "@/generated/prisma/client";
import { trainingFindUniqueArgs } from "@/generated/prisma/models";

export const GetAssesmentMetricsQuery = {
  where: {
    isArchived: false,
  },
  include: {
    metrics: {
      where: {
        isArchived: false,
      },
    },
  },
} satisfies Prisma.AssessmentTemplateSectionFindManyArgs;

export const AssesmentAthleteQuery = (id: string) =>
  ({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      athletes: {
        where: {
          assessments: {
            none: {
              trainingId: id,
            },
          },
        },
        select: {
          firstName: true,
          lastName: true,
          middleName: true,
          athleteId: true,
        },
      },
      staffId: true,
    },
  }) satisfies Prisma.trainingFindManyArgs;

export const GetAllTrainingSessionsQuery = {
  where: {
    isArchived: false,
  },
  include: {
    coach: {
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
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
      athletes: true,
      attendances: true,
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

export type GetAssesmentMetricsQueryType =
  Prisma.AssessmentTemplateSectionGetPayload<typeof GetAssesmentMetricsQuery>;

export type AssesmentAthleteQueryType = Prisma.trainingGetPayload<
  ReturnType<typeof AssesmentAthleteQuery>
>;
