/**
 * Shared billing date-math helpers.
 *
 * These were previously hand-copied (identically) into both
 * src/Modules/Users/AthletesOnboarding/Server/OnBoarding.ts and
 * src/app/(server)/api/cron-jobs/subscriptions/route.ts. This is the single
 * source of truth for them now; both call sites import from here.
 *
 * `nextBillingByInterval` is intentionally NOT unified here: the two
 * call sites disagree on what to do for an unrecognized/`ONCE` interval
 * (onboarding falls back to treating it as monthly; the recurring-invoice
 * cron deliberately returns null so a one-off subscription is never
 * auto-reinvoiced). Each call site keeps its own `nextBillingByInterval`
 * wrapper with its own fallback behavior, built on the shared primitives
 * below.
 */

/** The unified monthly billing day (the 30th, clamped to shorter months). */
export const BILLING_DAY = 30;

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function clampToDay(
  year: number,
  monthIndex0: number,
  day: number,
): Date {
  const dim = daysInMonth(year, monthIndex0);
  const clamped = Math.min(day, dim);
  return new Date(year, monthIndex0, clamped, 0, 0, 0, 0);
}

/**
 * Returns the billing day (default the 30th) of the month AFTER `now`,
 * clamped to the last day of that month if it's shorter (e.g. February).
 *
 * Example: any day in Feb -> Mar 30
 * Example: any day in Jan -> Feb 28/29 (clamped)
 */
export function nextMonthlyBillingDate(
  now: Date,
  billingDay: number = BILLING_DAY,
): Date {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const nextMonthDate = new Date(year, month + 1, 1);
  return clampToDay(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth(),
    billingDay,
  );
}
