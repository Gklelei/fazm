import { academyInstant, academyToday } from "@/lib/academy-time";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { cursorArgs, pageOf } from "@/lib/cursor";

export type SessionView = "upcoming" | "past";

export type SessionListParams = {
  view: SessionView;
  search: string;
  batchId: string;
};

export const SESSION_PAGE_SIZE = 25;

export function parseSessionParams(sp: Record<string, string | undefined | null>): SessionListParams {
  return {
    view: sp.view === "past" ? "past" : "upcoming",
    search: (sp.search ?? "").trim().slice(0, 100),
    batchId: sp.batchId ?? "",
  };
}

/** The filters as a query string (empty ones dropped), for the API and links. */
export function sessionParams(p: SessionListParams) {
  const q = new URLSearchParams();
  if (p.view !== "upcoming") q.set("view", p.view);
  if (p.search) q.set("search", p.search);
  if (p.batchId) q.set("batchId", p.batchId);
  return q;
}

const SESSION_ROW_SELECT = {
  id: true,
  name: true,
  date: true,
  duration: true,
  status: true,
  batch: { select: { id: true, name: true } },
  coach: { select: { fullNames: true } },
  location: { select: { name: true } },
  _count: { select: { athletes: true, attendances: true, assessments: true } },
} satisfies Prisma.trainingSelect;

export type SessionRow = Prisma.trainingGetPayload<{ select: typeof SESSION_ROW_SELECT }>;

/**
 * Upcoming: today onwards, soonest first. Past: before today, latest first.
 * Coaches only ever see the sessions they run.
 */
export type SessionsPage = { rows: SessionRow[]; nextCursor: string | null; total: number };

export async function listSessions(
  p: SessionListParams,
  viewer: { userId: string; role: string | null },
  cursor?: string | null,
): Promise<SessionsPage> {
  // Midnight in Nairobi, not in the server's zone
  const today = academyInstant(academyToday(), "00:00");
  const ci = { contains: p.search, mode: "insensitive" as const };

  const where: Prisma.trainingWhereInput = {
    isArchived: false,
    date: p.view === "upcoming" ? { gte: today } : { lt: today },
    ...(p.batchId ? { batchesId: p.batchId } : {}),
    ...(viewer.role === "COACH" ? { coach: { userId: viewer.userId } } : {}),
    ...(p.search
      ? {
          OR: [
            { name: ci },
            { description: ci },
            { batch: { name: ci } },
            { location: { name: ci } },
            { coach: { fullNames: ci } },
          ],
        }
      : {}),
  };

  const dir = p.view === "upcoming" ? "asc" : "desc";
  const [total, rows] = await Promise.all([
    db.training.count({ where }),
    db.training.findMany({
      where,
      select: SESSION_ROW_SELECT,
      orderBy: [{ date: dir }, { id: dir }],
      ...cursorArgs(cursor, SESSION_PAGE_SIZE),
    }),
  ]);
  const { items, nextCursor } = pageOf(rows, SESSION_PAGE_SIZE);
  return { rows: items, nextCursor, total };
}
