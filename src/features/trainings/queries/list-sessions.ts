import { startOfDay } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";

export type SessionView = "upcoming" | "past";

export type SessionListParams = {
  view: SessionView;
  search: string;
  batchId: string;
  page: number;
  pageSize: number;
};

export function parseSessionParams(sp: Record<string, string | undefined>): SessionListParams {
  const page = Number(sp.page);
  return {
    view: sp.view === "past" ? "past" : "upcoming",
    search: (sp.search ?? "").trim(),
    batchId: sp.batchId ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: 25,
  };
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
export async function listSessions(
  p: SessionListParams,
  viewer: { userId: string; role: string | null },
) {
  const today = startOfDay(new Date());
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

  const [total, rows] = await Promise.all([
    db.training.count({ where }),
    db.training.findMany({
      where,
      select: SESSION_ROW_SELECT,
      orderBy: { date: p.view === "upcoming" ? "asc" : "desc" },
      take: p.pageSize,
      skip: (p.page - 1) * p.pageSize,
    }),
  ]);

  return { total, rows, pages: Math.max(1, Math.ceil(total / p.pageSize)) };
}
