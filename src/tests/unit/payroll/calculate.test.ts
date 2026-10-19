import { describe, expect, it } from "vitest";
import { calculatePayslip, installmentOf, type DeductionRule } from "@/features/payroll/lib/calculate";

const KENYA: DeductionRule[] = [
  { name: "NSSF", kind: "PERCENT_GROSS", value: 6, maximum: 6480, beforeTax: true, employerPercent: 100 },
  { name: "SHIF", kind: "PERCENT_GROSS", value: 2.75, minimum: 300, beforeTax: true },
  { name: "Housing Levy", kind: "PERCENT_GROSS", value: 1.5, beforeTax: true, employerPercent: 100 },
  {
    name: "PAYE",
    kind: "BANDED",
    value: 0,
    relief: 2400,
    bands: [
      { upTo: 24000, rate: 10 },
      { upTo: 32333, rate: 25 },
      { upTo: 500000, rate: 30 },
      { upTo: 800000, rate: 32.5 },
      { upTo: null, rate: 35 },
    ],
  },
];
const amount = (p: ReturnType<typeof calculatePayslip>, name: string) => p.lines.find((l) => l.name === name)?.amount;

describe("calculatePayslip", () => {
  it("works out Kenyan statutory deductions on KES 50,000", () => {
    const p = calculatePayslip({ basic: 50000, deductions: KENYA });
    expect(amount(p, "NSSF")).toBe(3000);
    expect(amount(p, "SHIF")).toBe(1375);
    expect(amount(p, "Housing Levy")).toBe(750);
    // taxable 44,875: 2,400 + 2,083.25 + 3,762.60 − 2,400 relief
    expect(amount(p, "PAYE")).toBe(5845.85);
    expect(p.net).toBe(39029.15);
    expect(p.employer).toBe(3750);
  });

  it("caps NSSF, floors SHIF and gives no PAYE under relief", () => {
    expect(amount(calculatePayslip({ basic: 200000, deductions: KENYA }), "NSSF")).toBe(6480);
    const low = calculatePayslip({ basic: 8000, deductions: KENYA });
    expect(amount(low, "SHIF")).toBe(300);
    expect(amount(low, "PAYE")).toBeUndefined();
  });

  it("recovers advances oldest first and flags the two-thirds cap", () => {
    const p = calculatePayslip({
      basic: 30000,
      advances: [
        { id: "a", outstanding: 15000, installment: 15000 },
        { id: "b", outstanding: 10000, installment: 10000 },
      ],
    });
    expect(p.recoveries).toEqual([
      { advanceId: "a", amount: 15000 },
      { advanceId: "b", amount: 10000 },
    ]);
    expect(p.overCap).toBe(true);
    expect(p.maxAdvance).toBe(20000);
    const moved = calculatePayslip({ basic: 30000, advances: [{ id: "a", outstanding: 15000, installment: 15000 }, { id: "b", outstanding: 10000, installment: 10000 }], advanceOverride: 20000 });
    expect(moved.recoveries).toEqual([
      { advanceId: "a", amount: 15000 },
      { advanceId: "b", amount: 5000 },
    ]);
    expect(moved.overCap).toBe(false);
  });

  it("never takes more than the pay", () => {
    const p = calculatePayslip({ basic: 1000, advances: [{ id: "a", outstanding: 5000, installment: 5000 }] });
    expect(p.net).toBe(0);
    expect(p.recoveries[0].amount).toBe(1000);
  });

  it("adds allowances to gross and takes one-offs after tax", () => {
    const p = calculatePayslip({ basic: 20000, allowances: [{ name: "Transport", amount: 3000 }], oneOffs: [{ name: "Lost kit", amount: 500 }] });
    expect(p.gross).toBe(23000);
    expect(p.net).toBe(22500);
  });

  it("splits an advance into equal installments", () => {
    expect(installmentOf(10000, 3, 10000)).toBe(3333.34);
    expect(installmentOf(10000, 3, 1000)).toBe(1000);
  });
});
