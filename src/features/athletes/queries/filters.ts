import type { Prisma } from "@/generated/prisma/client";
import { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";

export type AthleteFilters = {
  search?: string;
  status?: ATHLETE_ACCOUNT_STATUS;
  /** Registration date range, inclusive, as YYYY-MM-DD */
  from?: string;
  to?: string;
  batchId?: string;
  /** "missing": athletes with no consent recorded */
  consent?: string;
};

export function athleteFiltersFromParams(sp: URLSearchParams): AthleteFilters {
  return {
    search: sp.get("search")?.trim() || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    batchId: sp.get("batchId") || undefined,
    status: parseStatus(sp.get("status")),
    consent: sp.get("consent") === "missing" ? "missing" : undefined,
  };
}

const parseStatus = (v: string | null) =>
  v && v in ATHLETE_ACCOUNT_STATUS ? (v as ATHLETE_ACCOUNT_STATUS) : undefined;

const ci = (term: string) => ({
  contains: term,
  mode: "insensitive" as const,
});

/**
 * A search word that is an athlete ID matches IDs only, not phone numbers:
 * "ATH-FFA-501", "ffa-50" or "ath-ffa-5" within the ID, and a short number like "501" or "7"
 * as the athlete number (ATH-FFA-501, ATH-FFA-007). Longer numbers are phones.
 */
export function athleteIdTerm(term: string): Prisma.AthleteWhereInput | null {
  if (/^(ath-|ffa-)/i.test(term))
    return { athleteId: { contains: term, mode: "insensitive" } };
  if (/^\d{1,5}$/.test(term))
    return { athleteId: { endsWith: `-${term.padStart(3, "0")}` } };
  return null;
}

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
  consent,
}: AthleteFilters): Prisma.AthleteWhereInput {
  const terms = (search ?? "").split(/\s+/).filter(Boolean);

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999`);

  return {
    isArchived: false,
    ...(batchId ? { batchesId: batchId } : {}),
    ...(status ? { status } : {}),
    ...(consent === "missing" ? { consents: { none: {} } } : {}),
    ...(from || to ? { createdAt } : {}),
    ...(terms.length
      ? {
          AND: terms.map((term): Prisma.AthleteWhereInput => {
            const id = athleteIdTerm(term);
            if (id) return id;
            return {
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
            };
          }),
        }
      : {}),
  };
}
