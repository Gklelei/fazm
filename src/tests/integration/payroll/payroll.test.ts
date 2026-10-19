import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeBatch, makeLocation, resetDb, signedIn } from "@/tests/support/db";
import { adjustPayslip, approveMonth, decideAdvance, recordAdvance, refreshMonth } from "@/features/payroll/actions/payroll";
import { advanceBalances, payrollJob } from "@/features/payroll/lib/run";

let n = 0;
const makeStaff = (data: { salary?: number; payBasis?: "MONTHLY" | "PER_SESSION"; sessionRate?: number } = {}) =>
  db.staff.create({ data: { staffId: `STF-T${++n}`, fullNames: `Test Coach ${n}`, phoneNumber: "+254700000000", payBasis: "MONTHLY", ...data } });

const slipOf = async (staffId: string, month = "2026-10") => db.payslip.findFirstOrThrow({ where: { staffId, run: { month } } });

describe("payroll", () => {
  beforeEach(resetDb);

  it("works out payslips once per person, and again without duplicates", async () => {
    await signedIn("FINANCE");
    const a = await makeStaff({ salary: 40000 });
    await makeStaff(); // no salary: a payslip of 0
    await db.staff.create({ data: { staffId: "STF-NOPAY", fullNames: "No Profile", phoneNumber: "+254700000001" } });
    await db.payrollDeduction.create({ data: { name: "SHIF", kind: "PERCENT_GROSS", value: 2.75, minimum: 300, beforeTax: true, enabled: true } });

    expect((await refreshMonth("2026-10")).success).toBe(true);
    expect((await refreshMonth("2026-10")).success).toBe(true);
    expect(await db.payslip.count()).toBe(2);
    expect(Number((await slipOf(a.id)).net)).toBe(38900);
  });

  it("takes an approved advance back over its months, and only after approval", async () => {
    const s = await makeStaff({ salary: 30000 });
    await signedIn("FINANCE");
    await recordAdvance({ staffId: s.id, date: "2026-10-05", amount: 9000, method: "MPESA", months: 3 });
    const adv = await db.salaryAdvance.findFirstOrThrow();
    expect((await decideAdvance(adv.id, true)).success).toBe(false); // finance can't approve

    await refreshMonth("2026-10");
    expect(Number((await slipOf(s.id)).net)).toBe(30000);

    await signedIn("ADMIN");
    await decideAdvance(adv.id, true);
    await approveMonth("2026-10");
    expect(Number((await slipOf(s.id)).net)).toBe(27000);
    expect((await advanceBalances(s.id))[0].outstanding).toBe(6000);

    await refreshMonth("2026-11");
    expect(Number((await slipOf(s.id, "2026-11")).net)).toBe(27000);
  });

  it("locks an approved month and posts it to expenses", async () => {
    await signedIn("ADMIN");
    const s = await makeStaff({ salary: 20000 });
    await db.payrollDeduction.create({ data: { name: "Housing Levy", kind: "PERCENT_GROSS", value: 1.5, employerPercent: 100, beforeTax: true, enabled: true } });
    expect((await approveMonth("2026-10")).success).toBe(true);
    const expense = await db.expenses.findFirstOrThrow({ include: { category: true } });
    expect(expense.amount).toBe(20300);
    expect(expense.category.name).toBe("Salaries");

    const slip = await slipOf(s.id);
    expect((await adjustPayslip(slip.id, { allowances: [{ name: "Bonus", amount: 1000 }] })).success).toBe(false);
    expect((await refreshMonth("2026-10")).success).toBe(false);
  });

  it("pays per completed session in the month", async () => {
    await signedIn("FINANCE");
    const s = await makeStaff({ payBasis: "PER_SESSION", sessionRate: 1500 });
    const [batch, location] = await Promise.all([makeBatch(), makeLocation()]);
    const session = (date: string, status: "COMPLETED" | "SCHEDULED") =>
      db.training.create({ data: { name: "Training", description: "", date: new Date(date), duration: 90, status, staffId: s.staffId, batchesId: batch.id, trainingLocationsId: location.id } });
    await Promise.all([session("2026-10-03T13:00:00Z", "COMPLETED"), session("2026-10-10T13:00:00Z", "COMPLETED"), session("2026-10-17T13:00:00Z", "SCHEDULED"), session("2026-11-01T13:00:00Z", "COMPLETED")]);
    await refreshMonth("2026-10");
    const slip = await slipOf(s.id);
    expect(slip.sessions).toBe(2);
    expect(Number(slip.gross)).toBe(3000);
  });

  it("keeps the admin's edits when the month is worked out again", async () => {
    await signedIn("FINANCE");
    const s = await makeStaff({ salary: 10000 });
    await refreshMonth("2026-10");
    await adjustPayslip((await slipOf(s.id)).id, { allowances: [{ name: "Transport", amount: 2000 }], oneOffs: [{ name: "Lost kit", amount: 500 }] });
    await refreshMonth("2026-10");
    expect(Number((await slipOf(s.id)).net)).toBe(11500);
  });

  it("runs the job only on the last day of the month", async () => {
    await makeStaff({ salary: 1000 });
    expect(await payrollJob({ now: new Date("2026-10-30T10:00:00Z") })).toMatchObject({ skipped: true });
    expect(await payrollJob({ now: new Date("2026-10-31T17:00:00Z") })).toMatchObject({ month: "2026-10", payslips: 1 });
  });
});
