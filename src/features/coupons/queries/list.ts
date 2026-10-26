import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { cursorArgs, pageOf } from "@/lib/cursor";
import type { CouponState } from "../lib/state";

export type CouponFilters = { search?: string; state?: CouponState };

const STATES = ["ON", "OFF", "NOT_STARTED", "EXPIRED", "USED_UP"] as const;

export function couponFiltersFromParams(sp: URLSearchParams): CouponFilters {
  const state = sp.get("state");
  return {
    search: sp.get("search")?.trim().toUpperCase().slice(0, 30) || undefined,
    state: STATES.find((s) => s === state),
  };
}

/** Coupons given as many times as they may be (uses are counted from redemptions). */
async function usedUpIds() {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM coupons c
    WHERE c.usage_limit IS NOT NULL
      AND (SELECT count(*) FROM coupon_redemptions r WHERE r.coupon_id = c.id AND r.status <> 'REMOVED') >= c.usage_limit`;
  return rows.map((r) => r.id);
}

export async function buildCouponWhere({ search, state }: CouponFilters, now = new Date()): Promise<Prisma.CouponWhereInput> {
  const notExpired = { OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] };
  const usedUp = state === "ON" || state === "NOT_STARTED" || state === "USED_UP" ? await usedUpIds() : [];
  const notUsedUp = { id: { notIn: usedUp } };
  const byState: Record<CouponState, Prisma.CouponWhereInput> = {
    ON: { status: 1, startDate: { lte: now }, AND: [notExpired, notUsedUp] },
    OFF: { status: { not: 1 } },
    NOT_STARTED: { status: 1, startDate: { gt: now }, AND: [notExpired, notUsedUp] },
    EXPIRED: { status: 1, expiryDate: { lt: now } },
    USED_UP: { status: 1, id: { in: usedUp }, AND: [notExpired] },
    ARCHIVED: {},
  };
  return {
    voided: 0,
    ...(search && { name: { contains: search } }),
    ...(state && byState[state]),
  };
}

export const COUPON_LIST_SELECT = {
  id: true,
  name: true,
  discountType: true,
  value: true,
  duration: true,
  durationCount: true,
  startDate: true,
  expiryDate: true,
  usageLimit: true,
  _count: { select: { redemptions: { where: { status: { not: "REMOVED" } } } } },
  oncePerAthlete: true,
  status: true,
  voided: true,
  createdAt: true,
  plans: { select: { id: true, name: true } },
} satisfies Prisma.CouponSelect;

type Row = Prisma.CouponGetPayload<{ select: typeof COUPON_LIST_SELECT }>;
/** Over the wire: money as numbers, dates as strings. */
export type CouponRow = Omit<Row, "value" | "startDate" | "expiryDate" | "createdAt" | "_count"> & {
  value: number;
  /** Times given (removed ones don't count) */
  uses: number;
  startDate: string;
  expiryDate: string | null;
  createdAt: string;
};
export type CouponsPage = { items: CouponRow[]; nextCursor: string | null; total?: number };

export const toCouponRow = ({ _count, ...r }: Row): CouponRow => ({
  ...r,
  uses: _count.redemptions,
  value: Number(r.value),
  startDate: r.startDate.toISOString(),
  expiryDate: r.expiryDate?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

const PAGE = 30;

/** Newest first. */
export async function listCoupons(f: CouponFilters, cursor?: string | null): Promise<CouponsPage> {
  const where = await buildCouponWhere(f);
  const [rows, total] = await Promise.all([
    db.coupon.findMany({ where, select: COUPON_LIST_SELECT, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...cursorArgs(cursor, PAGE) }),
    cursor ? undefined : db.coupon.count({ where }),
  ]);
  const { items, nextCursor } = pageOf(rows, PAGE);
  return { items: items.map(toCouponRow), nextCursor, total };
}
