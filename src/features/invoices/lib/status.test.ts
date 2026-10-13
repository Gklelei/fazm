import { describe, expect, it } from "vitest";
import { invoiceBalance, invoiceStatusFor } from "./status";

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

describe("invoiceBalance", () => {
  it("takes the discount off what is owed", () => {
    expect(invoiceBalance({ amountDue: "4000.00", discount: "750.00", amountPaid: "3250.00" })).toBe(0);
    expect(invoiceBalance({ amountDue: 4000, discount: null, amountPaid: 1000 })).toBe(3000);
  });
  it("never goes negative", () => {
    expect(invoiceBalance({ amountDue: 3000, amountPaid: 3500 })).toBe(0);
  });
});
