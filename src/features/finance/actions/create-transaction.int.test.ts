import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { signOut } from "@/test/session";
import { makeAthlete, makeInvoice, resetDb, signedIn } from "@/test/db";
import createFinancialTransaction from "./create-transaction";

const pay = (athleteId: string, invoiceNumber: string, amount: number) =>
  createFinancialTransaction({
    amountPaid: String(amount),
    paymentDate: new Date().toISOString(),
    paymentType: "MPESA_PAYBILL",
    collectedBy: "Front office",
    athleteId,
    invoiceId: invoiceNumber,
  });

describe("recording a payment", () => {
  beforeEach(resetDb);

  it("issues a receipt, updates the invoice and logs it", async () => {
    const { user } = await signedIn("FINANCE");
    const athlete = await makeAthlete();
    const invoice = await makeInvoice(athlete.athleteId, 4000);

    const res = await pay(athlete.athleteId, invoice.invoiceNumber, 1500);

    expect(res.success).toBe(true);
    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(Number(after.amountPaid)).toBe(1500);
    expect(after.status).toBe("PARTIAL");
    const [receipt] = await db.finance.findMany();
    expect(receipt.receiptNumber).toMatch(/^FEES-\d{8}-001$/);
    expect(await db.auditLog.count({ where: { action: "CREATE_PAYMENT", userId: user.id } })).toBe(1);
  });

  it("marks the invoice paid and activates a pending athlete on a paid subscription invoice", async () => {
    await signedIn("FINANCE");
    const athlete = await makeAthlete({ status: "PENDING" });
    const invoice = await makeInvoice(athlete.athleteId, 4000, { type: "SUBSCRIPTION" });

    await pay(athlete.athleteId, invoice.invoiceNumber, 4000);

    expect((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe("PAID");
    expect((await db.athlete.findUniqueOrThrow({ where: { id: athlete.id } })).status).toBe("ACTIVE");
  });

  it("refuses more than the balance", async () => {
    await signedIn("FINANCE");
    const athlete = await makeAthlete();
    const invoice = await makeInvoice(athlete.athleteId, 4000);
    await pay(athlete.athleteId, invoice.invoiceNumber, 3000);

    const res = await pay(athlete.athleteId, invoice.invoiceNumber, 1500);

    expect(res).toEqual({ success: false, message: "Overpayment detected. The balance is KES 1000" });
    expect(await db.finance.count()).toBe(1);
  });

  it("never lets two payments at once take the invoice past its balance", async () => {
    await signedIn("FINANCE");
    const athlete = await makeAthlete();
    const invoice = await makeInvoice(athlete.athleteId, 4000);

    const results = await Promise.all([3000, 3000].map((a) => pay(athlete.athleteId, invoice.invoiceNumber, a)));

    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(Number((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).amountPaid)).toBe(3000);
  });

  it("gives payments made at the same moment different receipt numbers", async () => {
    await signedIn("FINANCE");
    const athlete = await makeAthlete();
    const invoices = await Promise.all([1, 2, 3].map(() => makeInvoice(athlete.athleteId, 1000)));

    const results = await Promise.all(invoices.map((i) => pay(athlete.athleteId, i.invoiceNumber, 1000)));

    expect(results.every((r) => r.success)).toBe(true);
    const numbers = (await db.finance.findMany()).map((f) => f.receiptNumber);
    expect(new Set(numbers).size).toBe(3);
  });

  it("refuses coaches and signed-out requests", async () => {
    await signedIn("COACH");
    const athlete = await makeAthlete();
    const invoice = await makeInvoice(athlete.athleteId, 4000);
    expect((await pay(athlete.athleteId, invoice.invoiceNumber, 100)).success).toBe(false);

    signOut();
    expect((await pay(athlete.athleteId, invoice.invoiceNumber, 100)).success).toBe(false);
    expect(await db.finance.count()).toBe(0);
  });
});
