import type { Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action";

/** The academy part of every athlete ID: Fazam Football Academy */
const ACADEMY = "ATH/FFA";

/** The number as written in IDs: at least three digits (1 → 001, 1203 → 1203) */
export const athleteNumber = (n: number) => String(n).padStart(3, "0");

/** ATH/FFA/G/001 */
export const athleteIdFor = (code: string, n: number) => `${ACADEMY}/${code}/${athleteNumber(n)}`;

/**
 * The next athlete ID in a programme, counted per programme: ATH/FFA/M/956,
 * ATH/FFA/G/002. A programme without a code (set in Settings → Programmes)
 * still gets the old academy-wide ATH-FFA-### from athlete_sequence.
 *
 * Run it inside the registration's transaction: the counter is bumped in
 * one UPDATE, so two registrations at once queue on the row and never
 * share a number, and a failed registration hands its number back.
 */
export async function nextAthleteId(tx: Prisma.TransactionClient, programmeId: string): Promise<string> {
  const [p] = await tx.$queryRaw<{ code: string | null; n: number }[]>`
    UPDATE "programmes" SET "athlete_counter" = "athlete_counter" + 1
    WHERE "id" = ${programmeId} AND "code" IS NOT NULL
    RETURNING "code", "athlete_counter" AS n`;
  if (p?.code) return athleteIdFor(p.code, p.n);

  const exists = await tx.programme.findUnique({ where: { id: programmeId }, select: { id: true } });
  if (!exists) throw new ActionError("That programme no longer exists. Choose another batch.");
  const legacy = await tx.athleteSequence.update({
    where: { id: 1 },
    data: { current: { increment: 1 } },
    select: { current: true },
  });
  return `ATH-FFA-${athleteNumber(legacy.current)}`;
}
