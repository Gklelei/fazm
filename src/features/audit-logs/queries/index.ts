import { Prisma } from "@/generated/prisma/client";

export const FetchAuditLogsQuery = {
  orderBy: {
    createdAt: "desc" as const,
  },
  include: {
    user: {
      select: {
        name: true,
        email: true,
      },
    },
    athlete: {
      select: {
        firstName: true,
        lastName: true,
        athleteId: true,
      },
    },
    invoice: {
      select: { invoiceNumber: true, type: true },
    },
    training: {
      select: { name: true, date: true },
    },
    batch: {
      select: { name: true },
    },
    drill: {
      select: { name: true, value: true },
    },
  },
};

export type FetchAuditLogsType = Prisma.AuditLogGetPayload<
  typeof FetchAuditLogsQuery
>;
