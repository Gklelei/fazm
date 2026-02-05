import { Prisma } from "@/generated/prisma/client";

export const GetStaffQuery = {
  where: {
    user: {
      isArchived: false,
    },
  },
  include: {
    user: true,
  },
} satisfies Prisma.staffFindManyArgs;

export type GetStaffType = Prisma.staffGetPayload<typeof GetStaffQuery>;

export const GetUserProfileQuery = (id: string) =>
  ({
    where: {
      id,
    },

    include: {
      sessions: true,
      staff: true,
      accounts: true,
    },
  }) satisfies Prisma.UserFindUniqueArgs;

export type GetUserProfileType = Prisma.UserGetPayload<
  ReturnType<typeof GetUserProfileQuery>
>;

export const GetStaffByIdQuery = (id: string) =>
  ({
    where: {
      staffId: id,
    },
    include: {
      user: true,
      assessments: {
        select: {
          _count: true,
        },
      },
      attendances: true,
      trainings: true,
    },
  }) satisfies Prisma.staffFindUniqueArgs;

export type GetStaffByIdQueryType = Prisma.staffGetPayload<
  ReturnType<typeof GetStaffByIdQuery>
>;
