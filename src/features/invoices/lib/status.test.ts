import { describe, expect, it } from "vitest";
import { invoiceStatusFor } from "./status";

const now = new Date("2026-10-13T12:00:00Z");
const future = new Date("2026-10-20T00:00:00Z");
const past = new Date("2026-10-01T00:00:00Z");

describe("invoiceStatusFor", () => {
  it("is PAID once the amount due is covered, even if late", () => {
    expect(invoiceStatusFor(1000, 1000, past, now)).toBe("PAID");
    expect(invoiceStatusFor(1200, 1000, future, now)).toBe("PAID");
  });
  it("keeps unpaid or part-paid invoices past due as OVERDUE", () => {
    expect(invoiceStatusFor(0, 1000, past, now)).toBe("OVERDUE");
    expect(invoiceStatusFor(400, 1000, past, now)).toBe("OVERDUE");
  });
  it("is PARTIAL or PENDING before the due date", () => {
    expect(invoiceStatusFor(400, 1000, future, now)).toBe("PARTIAL");
    expect(invoiceStatusFor(0, 1000, future, now)).toBe("PENDING");
  });
});
