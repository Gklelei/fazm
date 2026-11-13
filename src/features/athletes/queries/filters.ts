import type { Prisma } from "@/generated/prisma/client";
import { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";
import { CONSENT_ENABLED } from "@/features/athletes/lib/consent-switch";
import { inProgramme } from "@/lib/programme-scope";

export type AthleteFilters = {
  search?: string;
  status?: ATHLETE_ACCOUNT_STATUS;
  /** Registration date range, inclusive, as YYYY-MM-DD */
  from?: string;
  to?: string;
  batchId?: string;
  /** "missing": athletes with no consent recorded */
  consent?: string;
  /** The header's programme (from the cookie, never the URL); null: all */
  programmeId?: string | null;
};

export function athleteFiltersFromParams(sp: URLSearchParams): AthleteFilters {
  return {
    search: sp.get("search")?.trim() || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    batchId: sp.get("batchId") || undefined,
    status: parseStatus(sp.get("status")),
    consent: CONSENT_ENABLED && sp.get("consent") === "missing" ? "missing" : undefined,
  };
}

const parseStatus = (v: string | null) =>
  v && v in ATHLETE_ACCOUNT_STATUS ? (v as ATHLETE_ACCOUNT_STATUS) : undefined;

const ci = (term: string) => ({
  contains: term,
  mode: "insensitive" as const,
});

/**
 * Ways a typed ID can match: IDs hold slashes (ATH/FFA/M/501) but people and
 * links type dashes, and athletes are still found by the ID they had before
 * (ATH-FFA-501). For any search box that looks in athlete IDs.
 */
export function athleteIdMatch(term: string): Prisma.AthleteWhereInput[] {
  const slashed = term.replaceAll("-", "/");
  const dashed = term.replaceAll("/", "-");
  return [{ athleteId: ci(slashed) }, { athleteId: ci(dashed) }, { formerAthleteId: ci(dashed) }];
}

/**
 * A search word that is an athlete ID matches IDs only, not phone numbers:
 * "ATH/FFA/M/501", "ath-ffa-m-5" or "ffa/g" within the ID; a programme code
 * and number like "G/1" or "m-501"; and a short number like "501" or "7" as
 * the athlete number in any programme (ATH/FFA/M/501, ATH/FFA/G/007). Longer
 * numbers are phones.
 */
export function athleteIdTerm(term: string): Prisma.AthleteWhereInput | null {
  if (/^(ath|ffa)[-/]/i.test(term)) return { OR: athleteIdMatch(term) };
  const coded = term.match(/^([a-z]{1,3})[-/](\d{1,5})$/i);
  if (coded) return { athleteId: { endsWith: `/${coded[1]}/${pad(coded[2])}`, mode: "insensitive" } };
  if (/^\d{1,5}$/.test(term)) {
    const n = pad(term);
    // Today's IDs (ATH-FFA-501), per-programme ones (ATH/FFA/M/501), and the number someone
    // had before being renumbered (954 still finds ATH/FFA/G/001, once ATH-FFA-954)
    return {
      OR: [{ athleteId: { endsWith: `-${n}` } }, { athleteId: { endsWith: `/${n}` } }, { formerAthleteId: { endsWith: `-${n}` } }],
    };
  }
  return null;
}

/** The number as written in IDs: at least three digits (7 → 007, 0501 → 501, 1203 → 1203) */
const pad = (digits: string) => String(Number(digits)).padStart(3, "0");

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
  programmeId,
}: AthleteFilters): Prisma.AthleteWhereInput {
  const terms = (search ?? "").split(/\s+/).filter(Boolean);

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999`);

  return {
    isArchived: false,
    ...inProgramme.athlete(programmeId ?? null),
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
                ...athleteIdMatch(term),
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
