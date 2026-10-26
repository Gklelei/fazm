import { Prisma } from "@/generated/prisma/client";

export const GetAthleteByIdQuery = (id: string) =>
  ({
    where: {
      athleteId: id,
    },
    include: {
      address: true,
      consents: { orderBy: { createdAt: "desc" as const }, include: { recordedBy: { select: { name: true } } } },
      emergencyContacts: true,
      guardians: true,
      medical: true,
      finances: { where: { isArchived: false }, orderBy: { paymentDate: "desc" } },
      athleteSubscriptions: {
        where: {
          status: "ACTIVE",
        },
        include: {
          subscriptionPlan: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: {
          subscriptionPlan: true,
          discounts: { select: { id: true, label: true, amount: true }, orderBy: { createdAt: "asc" as const } },
        },
      },
      assessments: {
        include: {
          coach: true,

          responses: {
            include: {
              metric: true,
            },
          },
          training: true,
        },
      },
      batches: { select: { id: true, name: true } },
      // Coupons given to the athlete, newest first
      couponRedemptions: {
        where: { invoiceId: null },
        orderBy: { createdAt: "desc" as const },
        include: { coupon: { select: { id: true, name: true, discountType: true, value: true, duration: true, durationCount: true } }, _count: { select: { discounts: true } } },
      },
    },
  }) satisfies Prisma.AthleteFindUniqueArgs;

export type GetAthleteByIdQueryType = Prisma.AthleteGetPayload<
  ReturnType<typeof GetAthleteByIdQuery>
>;
