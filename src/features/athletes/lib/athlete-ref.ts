import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";

/**
 * Matches an athlete from whatever a link or person gives: the record id, the
 * athlete ID as stored, the ID as written in a link (dashes for slashes), or
 * the ID they had before per-programme IDs (old links and papers).
 */
export function athleteRefWhere(ref: string): Prisma.AthleteWhereInput {
  const ref_ = ref.trim();
  return {
    OR: [
      { id: ref_ },
      { athleteId: ref_ },
      { athleteId: ref_.replaceAll("-", "/") },
      { formerAthleteId: ref_ },
    ],
  };
}

/** The athlete ID as stored, or null when nothing matches. */
export async function resolveAthleteId(ref: string | undefined | null) {
  if (!ref) return null;
  let text = ref;
  try {
    text = decodeURIComponent(ref);
  } catch {
    // a stray % in a typed link: use it as given
  }
  const a = await db.athlete.findFirst({ where: athleteRefWhere(text), select: { athleteId: true } });
  return a?.athleteId ?? null;
}
