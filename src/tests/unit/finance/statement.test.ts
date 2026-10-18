import { describe, expect, it } from "vitest";
import { buildStatement } from "@/features/finance/lib/statement";

// Noon Nairobi = 09:00 UTC, safely inside the day
const at = (d: string) => new Date(`${d}T09:00:00Z`);
const inv = (id: string, d: string, due: number, extra: Partial<{ discount: number; status: string; coupon: { name: string } }> = {}) => ({
  id, invoiceNumber: `INV-${id}`, createdAt: at(d), description: "Fees", amountDue: due, discount: extra.discount ?? 0, status: extra.status ?? "PENDING", coupon: extra.coupon ?? null,
});
const pay = (id: string, d: string, amount: number, isArchived = false) => ({
  id, receiptNumber: `FEES-${id}`, paymentDate: at(d), amountPaid: amount, paymentType: "MPESA_PAYBILL", notes: null, isArchived,
});

describe("athlete statement", () => {
  const invoices = [inv("1", "2026-08-30", 3000), inv("2", "2026-09-30", 3000, { discount: 300, coupon: { name: "SIB10" } }), inv("3", "2026-10-01", 500, { status: "CANCELED" })];
  const payments = [pay("1", "2026-09-05", 3000), pay("2", "2026-10-02", 1000), pay("3", "2026-10-03", 999, true)];

  it("runs the balance with discounts, leaving out cancelled invoices and removed payments", () => {
    const s = buildStatement({ invoices, payments });
    expect(s.lines.map((l) => [l.kind, l.balance])).toEqual([
      ["CHARGE", 3000],
      ["PAYMENT", 0],
      ["CHARGE", 3000],
      ["DISCOUNT", 2700],
      ["PAYMENT", 1700],
    ]);
    expect(s.lines[3].description).toBe("Discount (SIB10)");
    expect(s.lines[1].description).toBe("Payment · M-Pesa paybill");
    expect(s.closing).toBe(1700);
  });

  it("starts a period from the balance brought forward", () => {
    const s = buildStatement({ invoices, payments, from: "2026-09-30", to: "2026-09-30" });
    expect(s.opening).toBe(0);
    expect(s.lines).toHaveLength(2);
    expect([s.charges, s.credits, s.closing]).toEqual([3000, 300, 2700]);
    expect(buildStatement({ invoices, payments, from: "2026-10-01" }).opening).toBe(2700);
  });
});
