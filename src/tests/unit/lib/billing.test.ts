import { describe, expect, it } from "vitest";
import { BILLING_DAY, billingMonth, clampToDay, daysInMonth, nextMonthlyBillingDate } from "@/lib/billing";

describe("billingMonth", () => {
  const day = (s: string) => new Date(`${s}T00:00:00`);
  it("runs from the last 30th to the next", () => {
    const m = billingMonth(day("2026-11-13"));
    expect([m.start, m.end]).toEqual([day("2026-10-30"), day("2026-11-30")]);
    expect(m.unused).toBeCloseTo(17 / 31);
  });
  it("starts a new month on the billing day", () => {
    const m = billingMonth(day("2026-11-30"));
    expect([m.start, m.end, m.unused]).toEqual([day("2026-11-30"), day("2026-12-30"), 1]);
  });
  it("clamps to short months", () => {
    const m = billingMonth(day("2027-03-10"));
    expect([m.start, m.end]).toEqual([day("2027-02-28"), day("2027-03-30")]);
  });
});

describe("daysInMonth", () => {
  it("returns 31 for January", () => {
    expect(daysInMonth(2024, 0)).toBe(31);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInMonth(2023, 1)).toBe(28);
  });

  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it("returns 30 for April", () => {
    expect(daysInMonth(2024, 3)).toBe(30);
  });
});

describe("clampToDay", () => {
  it("keeps the requested day when the month is long enough", () => {
    const d = clampToDay(2024, 0, 30); // January, day 30
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(30);
  });

  it("clamps to the last day of a short month", () => {
    const d = clampToDay(2023, 1, 30); // February 2023 (28 days), day 30
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
  });

  it("clamps to the 29th in a leap-year February", () => {
    const d = clampToDay(2024, 1, 30); // February 2024 (29 days), day 30
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(29);
  });

  it("zeroes out the time component", () => {
    const d = clampToDay(2024, 5, 15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});

describe("nextMonthlyBillingDate", () => {
  it("returns the 30th of next month for a normal month", () => {
    const from = new Date(2024, 5, 10); // June 10, 2024
    const next = nextMonthlyBillingDate(from);
    expect(next.getFullYear()).toBe(2024);
    expect(next.getMonth()).toBe(6); // July
    expect(next.getDate()).toBe(30);
  });

  it("clamps to Feb 28 when starting from January in a non-leap year", () => {
    const from = new Date(2023, 0, 15); // January 15, 2023
    const next = nextMonthlyBillingDate(from);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(28);
  });

  it("clamps to Feb 29 when starting from January in a leap year", () => {
    const from = new Date(2024, 0, 15); // January 15, 2024
    const next = nextMonthlyBillingDate(from);
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(29);
  });

  it("clamps to Mar 30 when starting from February (documented example)", () => {
    const from = new Date(2024, 1, 5); // February 5, 2024
    const next = nextMonthlyBillingDate(from);
    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(30);
  });

  it("rolls over the year when starting from December", () => {
    const from = new Date(2024, 11, 5); // December 5, 2024
    const next = nextMonthlyBillingDate(from);
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(0); // January
    expect(next.getDate()).toBe(30);
  });

  it("respects a custom billing day", () => {
    const from = new Date(2024, 5, 10); // June 10, 2024
    const next = nextMonthlyBillingDate(from, 15);
    expect(next.getMonth()).toBe(6); // July
    expect(next.getDate()).toBe(15);
  });

  it("uses BILLING_DAY (30) as the default", () => {
    const from = new Date(2024, 5, 10);
    expect(nextMonthlyBillingDate(from).getDate()).toBe(
      Math.min(30, daysInMonth(2024, 6)),
    );
    expect(BILLING_DAY).toBe(30);
  });
});
