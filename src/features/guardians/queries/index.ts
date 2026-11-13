import { Prisma } from "@/generated/prisma/client";
import { PHOTO_SELECT } from "@/features/athletes/lib/photo";
import { inProgramme } from "@/lib/programme-scope";
import { athleteIdMatch } from "@/features/athletes/queries/filters";

export const GuardiansQuery = {
  include: {
    athlete: {
      select: {
        athleteId: true,
        firstName: true,
        lastName: true,
        middleName: true,
        ...PHOTO_SELECT,
        batches: {
          select: {
            name: true,
          },
        },
      },
    },
  },
} satisfies Prisma.AthleteGuardianFindManyArgs;

export type GuardiansResponseType = Prisma.AthleteGuardianGetPayload<
  typeof GuardiansQuery
>;

export type GuardianFilters = {
  search?: string;
  batchId?: string;
  /** The header's programme (from the cookie, never the URL); null: all */
  programmeId?: string | null;
};

export function guardianFiltersFromParams(get: (k: string) => string | null | undefined): GuardianFilters {
  return {
    search: get("search")?.trim().slice(0, 100) || undefined,
    batchId: get("batchId") || undefined,
  };
}

/**
 * Guardians of athletes on the roster, shared by the page and its export so
 * both list the same people. Each search word must match the guardian or their athlete.
 */
export function buildGuardianWhere({ search, batchId, programmeId }: GuardianFilters): Prisma.AthleteGuardianWhereInput {
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const terms = (search ?? "").split(/\s+/).filter(Boolean);
  return {
    athlete: {
      isArchived: false,
      ...inProgramme.athlete(programmeId ?? null),
      ...(batchId ? { batchesId: batchId } : {}),
    },
    ...(terms.length
      ? {
          AND: terms.map((t) => ({
            OR: [
              { fullNames: ci(t) },
              { phoneNumber: ci(t) },
              { email: ci(t) },
              { relationship: ci(t) },
              { athlete: { firstName: ci(t) } },
              { athlete: { middleName: ci(t) } },
              { athlete: { lastName: ci(t) } },
              { athlete: { OR: athleteIdMatch(t) } },
            ],
          })),
        }
      : {}),
  };
}
