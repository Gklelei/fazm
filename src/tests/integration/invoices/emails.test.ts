import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, resetDb } from "@/tests/support/db";

const sendMail = vi.fn<(mail: { to: string[]; subject: string; attachments?: unknown[] }) => Promise<ActionResult>>(async () => ({ success: true, message: "sent" }));
vi.mock("@/lib/mail", () => ({ sendMail: (m: never) => sendMail(m) }));
vi.mock("@/features/invoices/lib/pdf", () => ({
  invoicePdf: async (where: { invoiceNumber: string }) => ({
    invoice: await db.invoice.findUniqueOrThrow({ where, include: { athlete: true, lines: true } }),
    pdf: Buffer.from("%PDF-test"),
  }),
}));

const { emailInvoice, emailReceipt, overdueReminders } = await import("@/features/invoices/lib/emails");

const academy = (on: boolean) =>
  db.academy.create({
    data: { academyName: "Test Academy", paymentMathod: "123456", paymentMethodType: "Paybill", emailInvoices: on, emailReceipts: on, emailOverdue: on },
  });

async function athleteWithGuardian(email = "Parent@Example.test") {
  const a = await makeAthlete();
  await db.athleteGuardian.create({ data: { athleteId: a.athleteId, fullNames: "Parent Test", relationship: "Mother", email, phoneNumber: "+254700000001" } });
  return a;
}

describe("guardian emails", () => {
  beforeEach(async () => {
    await resetDb();
    sendMail.mockClear();
  });

  it("sends a new invoice to the guardian with the PDF", async () => {
    await academy(true);
    const a = await athleteWithGuardian();
    const inv = await makeInvoice(a.athleteId, 3000);

    await emailInvoice(inv.invoiceNumber);

    expect(sendMail).toHaveBeenCalledOnce();
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toEqual(["parent@example.test"]);
    expect(mail.attachments).toEqual([expect.objectContaining({ filename: `${inv.invoiceNumber}.pdf`, contentType: "application/pdf" })]);
  });

  it("sends nothing while the emails are off, or when there's no address", async () => {
    await academy(false);
    const a = await athleteWithGuardian();
    await emailInvoice((await makeInvoice(a.athleteId)).invoiceNumber);
    await db.academy.updateMany({ data: { emailInvoices: true } });
    const b = await athleteWithGuardian("not an email");
    await emailInvoice((await makeInvoice(b.athleteId)).invoiceNumber);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends a receipt for a payment", async () => {
    await academy(true);
    const a = await athleteWithGuardian();
    const inv = await makeInvoice(a.athleteId, 3000);
    await db.finance.create({ data: { athleteId: a.athleteId, invoiceId: inv.id, amountPaid: 1000, collectedBy: "Office", receiptNumber: "FEES-TEST-1" } });

    await emailReceipt("FEES-TEST-1");

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0][0].subject).toBe(`Receipt FEES-TEST-1 for ${a.firstName} ${a.lastName}`);
  });

  it("reminds about an overdue invoice at most once a week", async () => {
    await academy(true);
    const a = await athleteWithGuardian();
    const inv = await makeInvoice(a.athleteId, 3000, { dueDate: new Date(Date.now() - 10 * 86_400_000) });
    await db.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } });

    const now = new Date();
    expect((await overdueReminders({ now })).sent).toBe(1);
    expect((await overdueReminders({ now: new Date(now.getTime() + 3 * 86_400_000) })).sent).toBe(0);
    expect((await overdueReminders({ now: new Date(now.getTime() + 8 * 86_400_000) })).sent).toBe(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
