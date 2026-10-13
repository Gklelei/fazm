import type { Prisma } from "@/generated/prisma/client";
import { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";

export type AthleteFilters = {
  search?: string;
  status?: ATHLETE_ACCOUNT_STATUS;
  /** Registration date range, inclusive, as YYYY-MM-DD */
  from?: string;
  to?: string;
  batchId?: string;
};

export function athleteFiltersFromParams(sp: URLSearchParams): AthleteFilters {
  return {
    search: sp.get("search")?.trim() || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    batchId: sp.get("batchId") || undefined,
    status: parseStatus(sp.get("status")),
  };
}

const parseStatus = (v: string | null) =>
  v && v in ATHLETE_ACCOUNT_STATUS ? (v as ATHLETE_ACCOUNT_STATUS) : undefined;

const ci = (term: string) => ({
  contains: term,
  mode: "insensitive" as const,
});

/**
 * Shared by the roster list and the export so both return the same athletes.
 * Each search word must match a name, ID, contact, or any guardian detail.
 */
export function buildAthleteWhere({
  search,
  from,
  to,
  batchId,
  status,
}: AthleteFilters): Prisma.AthleteWhereInput {
  const terms = (search ?? "").split(/\s+/).filter(Boolean);

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999`);

  return {
    isArchived: false,
    ...(batchId ? { batchesId: batchId } : {}),
    ...(status ? { status } : {}),
    ...(from || to ? { createdAt } : {}),
    ...(terms.length
      ? {
          AND: terms.map((term) => ({
            OR: [
              { firstName: ci(term) },
              { lastName: ci(term) },
              { middleName: ci(term) },
              { athleteId: ci(term) },
              { phoneNumber: ci(term) },
              { email: ci(term) },
              {
                guardians: {
                  some: {
                    OR: [
                      { fullNames: ci(term) },
                      { phoneNumber: ci(term) },
                      { email: ci(term) },
                    ],
                  },
                },
              },
            ],
          })),
        }
      : {}),
  };
}
