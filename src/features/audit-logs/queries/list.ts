import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { academyInstant } from "@/lib/academy-time";
import { cursorArgs, pageOf } from "@/lib/cursor";
import { ACCESS_ACTIONS, AREAS, KINDS, SECURITY_ACTIONS, type Area, type Kind } from "../lib/catalog";

export const PAGE_SIZE = 50;

export type ActivityFilters = {
  kind: Kind;
  person: string;
  area: Area | "";
  from: string;
  to: string;
  search: string;
};

const ymd = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/** Filters from the URL (page) or the export request; unknown values are ignored. */
export function activityFiltersFromParams(get: (key: string) => string | null | undefined): ActivityFilters {
  const kind = KINDS.find((k) => k.key === get("kind"))?.key ?? "changes";
  const area = AREAS.find((a) => a.key === get("area"))?.key ?? "";
  return {
    kind,
    person: (get("person") ?? "").slice(0, 64),
    area,
    from: ymd(get("from")),
    to: ymd(get("to")),
    search: (get("q") ?? "").trim().slice(0, 100),
  };
}

export function buildActivityWhere(f: ActivityFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.kind === "access") and.push({ action: { in: ACCESS_ACTIONS } });
  if (f.kind === "security") and.push({ action: { in: SECURITY_ACTIONS } });
  if (f.kind === "changes") and.push({ action: { notIn: [...ACCESS_ACTIONS, ...SECURITY_ACTIONS] } });
  if (f.person) and.push({ userId: f.person });
  if (f.area) and.push({ resource: { in: [...(AREAS.find((a) => a.key === f.area)?.resources ?? [])] } });
  // Dates are academy days (Nairobi), whatever zone the server runs in
  if (f.from) and.push({ createdAt: { gte: academyInstant(f.from, "00:00") } });
  if (f.to) and.push({ createdAt: { lt: new Date(academyInstant(f.to, "00:00").getTime() + 86_400_000) } });
  if (f.search) {
    and.push({
      OR: [
        { details: { contains: f.search, mode: "insensitive" } },
        { recordId: { contains: f.search, mode: "insensitive" } },
        { user: { name: { contains: f.search, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: and };
}

export const ACTIVITY_SELECT = {
  id: true,
  action: true,
  resource: true,
  details: true,
  role: true,
  ip: true,
  userAgent: true,
  recordId: true,
  changes: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
  athlete: { select: { athleteId: true } },
  invoice: { select: { id: true } },
  training: { select: { id: true } },
} satisfies Prisma.AuditLogSelect;

export type ActivityRow = Prisma.AuditLogGetPayload<{ select: typeof ACTIVITY_SELECT }>;

/** Over the wire dates are strings. */
export type ActivityPage = { rows: ActivityRow[]; nextCursor: string | null; total: number };

/** One page of the log, newest first; `total` counts everything matching the filters. */
export async function listActivity(f: ActivityFilters, cursor?: string | null): Promise<ActivityPage> {
  const where = buildActivityWhere(f);
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: ACTIVITY_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorArgs(cursor, PAGE_SIZE),
    }),
    db.auditLog.count({ where }),
  ]);
  const { items, nextCursor } = pageOf(rows, PAGE_SIZE);
  return { rows: items, nextCursor, total };
}

/** Everyone who appears in the log, for the person filter. */
export const listLoggedPeople = () =>
  db.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } });

/** Filters as a query string (empty ones dropped), for the API, export and links. */
export function activityParams(f: Omit<ActivityFilters, never>) {
  const p = new URLSearchParams();
  if (f.kind !== "changes") p.set("kind", f.kind);
  if (f.person) p.set("person", f.person);
  if (f.area) p.set("area", f.area);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.search) p.set("q", f.search);
  return p;
}
