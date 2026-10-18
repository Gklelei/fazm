import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, resetDb } from "@/tests/support/db";

vi.mock("@/features/invoices/lib/emails", () => ({ emailInvoice: async () => {} }));
const { lateFees } = await import("@/features/invoices/lib/late-fees");

const academy = (lateFeeAmount: number | null) =>
  db.academy.create({ data: { academyName: "Test Academy", paymentMathod: "123456", paymentMethodType: "Paybill", lateFeeAmount, lateFeeGraceDays: 7 } });

async function overdue(daysAgo: number) {
  const a = await makeAthlete();
  const inv = await makeInvoice(a.athleteId, 3000, { dueDate: new Date(Date.now() - daysAgo * 86_400_000) });
  return db.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } });
}

describe("late fees", () => {
  beforeEach(resetDb);

  it("charges once per invoice overdue past the grace days", async () => {
    await academy(500);
    const late = await overdue(10);
    await overdue(3); // still in grace

    expect((await lateFees()).charged).toBe(1);
    expect((await lateFees()).charged).toBe(0);

    const fee = await db.invoice.findFirstOrThrow({ where: { type: "LATE_FEE" } });
    expect(fee.lateFeeForId).toBe(late.id);
    expect(Number(fee.amountDue)).toBe(500);
    expect(fee.description).toBe(`Late fee for ${late.invoiceNumber}`);
  });

  it("never charges a late fee on a late fee, or when none is set", async () => {
    await academy(null);
    await overdue(10);
    expect((await lateFees()).charged).toBe(0);

    await db.academy.updateMany({ data: { lateFeeAmount: 500 } });
    await lateFees();
    await db.invoice.updateMany({ where: { type: "LATE_FEE" }, data: { status: "OVERDUE", dueDate: new Date(Date.now() - 30 * 86_400_000) } });
    expect((await lateFees()).charged).toBe(0);
    expect(await db.invoice.count({ where: { type: "LATE_FEE" } })).toBe(1);
  });
});
