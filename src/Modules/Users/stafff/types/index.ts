import { Prisma, ROLES } from "@/generated/prisma/client";

export const GetStaffQuery = ({
  role,
  search,
}: {
  search?: string;
  role?: string;
}) =>
  ({
    where: {
      fullNames: {
        contains: search,
        mode: "insensitive",
      },
      staffId: {
        contains: search,
        mode: "insensitive",
      },
      user: {
        isArchived: false,
        role: {
          equals: role as ROLES,
        },
      },
    },
    include: {
      user: true,
    },
  }) satisfies Prisma.staffFindManyArgs;

export type GetStaffType = Prisma.staffGetPayload<
  ReturnType<typeof GetStaffQuery>
>;

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
