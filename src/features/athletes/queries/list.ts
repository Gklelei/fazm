import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { buildAthleteWhere, type AthleteFilters } from "./filters";

/** What one roster row needs: identity, batch, and who to call. */
export const ATHLETE_LIST_SELECT = {
  id: true,
  athleteId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  age: true,
  status: true,
  profilePIcture: true,
  phoneNumber: true,
  createdAt: true,
  batches: { select: { id: true, name: true } },
  guardians: {
    select: { fullNames: true, phoneNumber: true, relationship: true },
    take: 1,
  },
} satisfies Prisma.AthleteSelect;

export type AthleteListItem = Prisma.AthleteGetPayload<{
  select: typeof ATHLETE_LIST_SELECT;
}>;

/** Over the wire dates are strings. */
export type AthleteListRow = Omit<AthleteListItem, "createdAt"> & {
  createdAt: string | Date;
};

export type AthletesPage = {
  allAthletes: AthleteListRow[];
  nextCursor: string | null;
  pageSize: number;
};

const encodeCursor = (id: string) => Buffer.from(id).toString("base64url");
const decodeCursor = (c: string) => {
  try {
    return Buffer.from(c, "base64url").toString("utf8") || null;
  } catch {
    return null;
  }
};

/**
 * One page of the roster, newest registrations first. Shared by the
 * players page (first page, server-rendered) and the infinite-scroll API.
 */
export async function listAthletes(
  filters: AthleteFilters,
  { cursor, pageSize = 20 }: { cursor?: string | null; pageSize?: number } = {},
): Promise<AthletesPage> {
  const take = Math.min(Math.max(pageSize, 1), 50);
  const after = cursor ? decodeCursor(cursor) : null;

  const rows = await db.athlete.findMany({
    where: buildAthleteWhere(filters),
    select: ATHLETE_LIST_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    allAthletes: items,
    nextCursor: hasMore ? encodeCursor(items[items.length - 1].id) : null,
    pageSize: take,
  };
}
