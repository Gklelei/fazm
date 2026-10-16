import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ROLES } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";
import { cursorArgs, pageOf } from "@/lib/cursor";

export type StaffFilters = {
  search?: string;
  /** "role:COACH" etc., or "none" for staff who don't sign in */
  access?: string;
};

export function staffFiltersFromParams(sp: URLSearchParams): StaffFilters {
  const access = sp.get("access") ?? "";
  return {
    search: sp.get("search")?.trim().slice(0, 100) || undefined,
    access: access === "none" || (access.startsWith("role:") && access.slice(5) in ROLES) ? access : undefined,
  };
}

export function buildStaffWhere({ search, access }: StaffFilters): Prisma.staffWhereInput {
  const ci = (v: string) => ({ contains: v, mode: "insensitive" as const });
  const terms = (search ?? "").split(/\s+/).filter(Boolean);
  const signIn: Prisma.staffWhereInput =
    access === "none"
      ? { OR: [{ userId: null }, { user: { isArchived: true } }] }
      : access?.startsWith("role:")
        ? { user: { role: access.slice(5) as ROLES, isArchived: false } }
        : {};
  return {
    isArchived: false,
    ...signIn,
    ...(terms.length && {
      AND: terms.map((t) => ({
        OR: [{ fullNames: ci(t) }, { staffId: ci(t) }, { phoneNumber: ci(t.replace(/\s/g, "")) }, { jobTitle: ci(t) }, { email: ci(t) }],
      })),
    }),
  };
}

export const STAFF_LIST_SELECT = {
  id: true,
  staffId: true,
  fullNames: true,
  phoneNumber: true,
  email: true,
  photo: true,
  jobTitle: true,
  startDate: true,
  userId: true,
  user: { select: { email: true, role: true, isArchived: true, mustChangePassword: true } },
  batches: { select: { id: true, name: true } },
} satisfies Prisma.staffSelect;

export type StaffRow = Prisma.staffGetPayload<{ select: typeof STAFF_LIST_SELECT }>;
export type StaffPage = { items: StaffRow[]; nextCursor: string | null; total?: number };

const PAGE = 30;

/** Active staff, A–Z. */
export async function listStaff(f: StaffFilters, cursor?: string | null): Promise<StaffPage> {
  const where = buildStaffWhere(f);
  const [rows, total] = await Promise.all([
    db.staff.findMany({ where, select: STAFF_LIST_SELECT, orderBy: [{ fullNames: "asc" }, { id: "asc" }], ...cursorArgs(cursor, PAGE) }),
    cursor ? undefined : db.staff.count({ where }),
  ]);
  return { ...pageOf(rows, PAGE), total };
}
