import { Prisma } from "@/generated/prisma/client";

export const getAcademyQuery = {} satisfies Prisma.academyFindManyArgs;

export type getAcademyQueryType = Prisma.academyGetPayload<
  typeof getAcademyQuery
>;
