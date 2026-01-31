import { Prisma } from "@/generated/prisma/client";

export const GetStaffQuery = {
  include: {
    user: {
      select: {
        image: true,
        email: true,
      },
    },
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
