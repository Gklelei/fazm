import "server-only";
import { db } from "@/lib/prisma";

/** Everyone billable in the batches: not archived, not deactivated. */
export async function recipientsInBatches(batches: string[]) {
  if (!batches.length) return [];
  return db.athlete.findMany({
    where: { batchesId: { in: batches }, isArchived: false, status: { not: "DEACTIVATED" } },
    select: {
      athleteId: true,
      firstName: true,
      middleName: true,
      lastName: true,
      batchesId: true,
      billingStoppedAt: true,
      // Their plan now, shown beside them
      athleteSubscriptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1, select: { subscriptionPlan: { select: { id: true, name: true } } } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}
