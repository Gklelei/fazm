import { Prisma } from "@/generated/prisma/client";

export const getAcademyQuery = {
  select: {
    academyName: true,
    address: true,
    contactEmail: true,
    contactPhone: true,
    createdAt: true,
    description: true,
    heroImageUrl: true,
    id: true,
    logoUrl: true,
    paymentMathod: true,
    paymentMethodType: true,
    primaryColor: true,
    tagline: true,
    updatedAt: true,
  },
} satisfies Prisma.academyFindFirstArgs;

export type getAcademyQueryType = Prisma.academyGetPayload<
  typeof getAcademyQuery
>;
