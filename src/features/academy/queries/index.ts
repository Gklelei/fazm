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
    signatureUrl: true,
    stampUrl: true,
    paymentMathod: true,
    paymentMethodType: true,
    paymentReference: true,
    bankName: true,
    bankAccountName: true,
    bankAccountNumber: true,
    bankBranch: true,
    primaryColor: true,
    theme: true,
    tagline: true,
    updatedAt: true,
    receiptFooterNotes: true,
    kraPin: true,
    documentTerms: true,
  },
} satisfies Prisma.academyFindFirstArgs;

export type getAcademyQueryType = Prisma.academyGetPayload<
  typeof getAcademyQuery
>;
