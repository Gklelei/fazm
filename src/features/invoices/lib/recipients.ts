import "server-only";
import { db } from "@/lib/prisma";

/** Everyone billable in the batches: not archived, not deactivated. */
export async function recipientsInBatches(batches: string[]) {
  if (!batches.length) return [];
  return db.athlete.findMany({
    where: { batchesId: { in: batches }, isArchived: false, status: { not: "DEACTIVATED" } },
    select: { athleteId: true },
    orderBy: { athleteId: "asc" },
  });
}
