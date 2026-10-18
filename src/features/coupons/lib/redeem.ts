import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export const COUPON_RULES_SELECT = {
  id: true,
  name: true,
  discountType: true,
  value: true,
  interval: true,
  startDate: true,
  expiryDate: true,
  usageLimit: true,
  timesUsed: true,
  oncePerAthlete: true,
  status: true,
  voided: true,
  plans: { select: { id: true, name: true } },
} satisfies Prisma.CouponSelect;

export type CouponRules = Prisma.CouponGetPayload<{ select: typeof COUPON_RULES_SELECT }>;

const cents = (n: number) => Math.round(n * 100) / 100;

/** Why the coupon can't be used right now, or null. */
export function couponProblem(c: CouponRules, now = new Date()): string | null {
  if (c.voided === 1) return `${c.name} has been archived.`;
  if (c.status !== 1) return `${c.name} is switched off.`;
  if (c.startDate > now) return `${c.name} can't be used yet.`;
  if (c.expiryDate && c.expiryDate < now) return `${c.name} has expired.`;
  if (c.usageLimit != null && c.timesUsed >= c.usageLimit) return `${c.name} has been used up.`;
  return null;
}

/**
 * The discount on an invoice's lines: a percentage or a fixed amount, of the
 * whole invoice, or only of the lines for the coupon's fee plans. Never more
 * than those lines come to.
 */
export function discountFor(
  c: Pick<CouponRules, "discountType" | "value"> & { plans: { id: string }[] },
  lines: { amount: unknown; subscriptionPlanId: string | null }[],
): number {
  const plans = new Set(c.plans.map((p) => p.id));
  const base = cents(
    lines.filter((l) => !plans.size || (l.subscriptionPlanId && plans.has(l.subscriptionPlanId))).reduce((sum, l) => sum + Number(l.amount), 0),
  );
  if (base <= 0) return 0;
  const value = Number(c.value);
  return cents(c.discountType === "PERCENTAGE" ? (base * Math.min(value, 100)) / 100 : Math.min(value, base));
}

/** Refuses a second use by the same athlete when the coupon is once per athlete. */
export async function checkOncePerAthlete(tx: Tx, c: CouponRules, athleteId: string) {
  if (!c.oncePerAthlete) return null;
  const [invoices, plans] = await Promise.all([
    tx.invoice.count({ where: { couponId: c.id, athleteId } }),
    tx.athleteSubscription.count({ where: { couponId: c.id, athleteId } }),
  ]);
  return invoices + plans ? `${c.name} can only be used once per athlete, and this athlete has had it.` : null;
}

/** Counts one use, refusing if the limit was reached meanwhile (safe when two people apply it at once). */
export async function takeUse(tx: Tx, c: CouponRules) {
  const updated = await tx.coupon.updateMany({
    where: { id: c.id, voided: 0, status: 1, ...(c.usageLimit != null && { timesUsed: { lt: c.usageLimit } }) },
    data: { timesUsed: { increment: 1 } },
  });
  return updated.count === 1 ? null : `${c.name} has been used up.`;
}

export const giveUseBack = (tx: Tx, couponId: string) =>
  tx.coupon.updateMany({ where: { id: couponId, timesUsed: { gt: 0 } }, data: { timesUsed: { decrement: 1 } } });

/**
 * The repeating coupon on the athlete's fee plan that applies to a new fees
 * invoice, with its discount, or null.
 */
export async function feePlanCoupon(
  tx: Tx,
  athleteId: string,
  lines: { amount: unknown; subscriptionPlanId: string | null }[],
  now = new Date(),
) {
  const subs = await tx.athleteSubscription.findMany({
    where: { athleteId, status: "ACTIVE", coupon: { interval: "REPEATING" } },
    select: { coupon: { select: COUPON_RULES_SELECT } },
  });
  for (const { coupon } of subs) {
    // Uses were counted when it went on the fee plan; only validity matters now
    if (!coupon || couponProblem({ ...coupon, usageLimit: null }, now)) continue;
    const amount = discountFor(coupon, lines);
    if (amount > 0) return { coupon, amount };
  }
  return null;
}
