/** What a coupon's state reads as, from its fields. Shared by list, page and filters. */
export type CouponState = "ON" | "OFF" | "NOT_STARTED" | "EXPIRED" | "USED_UP" | "ARCHIVED";

export const COUPON_STATE_LABEL: Record<CouponState, string> = {
  ON: "On",
  OFF: "Off",
  NOT_STARTED: "Starts later",
  EXPIRED: "Expired",
  USED_UP: "Used up",
  ARCHIVED: "Archived",
};

export function couponState(
  c: { voided: number; status: number; startDate: Date | string; expiryDate: Date | string | null; usageLimit: number | null; timesUsed: number },
  now = new Date(),
): CouponState {
  if (c.voided) return "ARCHIVED";
  if (c.status !== 1) return "OFF";
  if (c.expiryDate && new Date(c.expiryDate) < now) return "EXPIRED";
  if (c.usageLimit != null && c.timesUsed >= c.usageLimit) return "USED_UP";
  if (new Date(c.startDate) > now) return "NOT_STARTED";
  return "ON";
}

/** "10%" or "Ksh 500". */
export const discountLabel = (c: { discountType: string; value: unknown }, money: (n: number) => string) =>
  c.discountType === "PERCENTAGE" ? `${Number(c.value)}%` : money(Number(c.value));
