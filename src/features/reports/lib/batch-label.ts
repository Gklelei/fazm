import "server-only";
import { db } from "@/lib/prisma";

type BatchRef = { name: string; programme: { name: string } } | null | undefined;

/**
 * How reports name a batch. "U13" when only one programme has a U13; "Girls U13"
 * when the name repeats across programmes, so Boys U13 and Girls U13 aren't
 * added together. The drill-down reads the same label back with `batchIdsFor`.
 */
export async function batchLabeller() {
  const batches = await db.batches.findMany({ select: { name: true, programmeId: true } });
  const programmesOf = new Map<string, Set<string>>();
  for (const b of batches) {
    const key = b.name.toLowerCase();
    programmesOf.set(key, (programmesOf.get(key) ?? new Set()).add(b.programmeId));
  }
  return (b: BatchRef, none: string) => {
    if (!b) return none;
    return (programmesOf.get(b.name.toLowerCase())?.size ?? 0) > 1 ? `${b.programme.name} ${b.name}` : b.name;
  };
}

/** The batches a report label stands for ("U13" or "Girls U13"). */
export async function batchIdsFor(label: string) {
  const batches = await db.batches.findMany({ select: { id: true, name: true, programme: { select: { name: true } } } });
  const label_ = await batchLabeller();
  return batches.filter((b) => label_(b, "") === label).map((b) => b.id);
}
