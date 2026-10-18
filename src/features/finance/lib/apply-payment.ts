import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { invoiceStatusFor, payableOf, invoiceBalance } from "@/features/invoices/lib/status";
import { nextDocumentNumbers } from "@/lib/document-numbers";

export class OverpaymentError extends Error {}

/**
 * Records one payment on one invoice inside a transaction: locks the
 * invoice, refuses more than its balance, issues a receipt number, updates
 * what's paid and the status, and activates a pending athlete once a fees
 * invoice is fully paid. Used for single and family payments.
 */
export async function applyPayment(
  ctx: Prisma.TransactionClient,
  p: { invoiceId: string; athleteId: string; amount: number; paymentDate: Date; paymentType: "CASH" | "BANK_TRANSFER" | "MPESA_SEND_MONEY" | "MPESA_PAYBILL"; collectedBy: string; notes: string },
) {
  // Row lock: a second payment on this invoice waits here until this
  // one commits, so both can't start from the same balance.
  await ctx.$queryRaw`SELECT id FROM invoices WHERE id = ${p.invoiceId} FOR UPDATE`;
  const invoice = await ctx.invoice.findUniqueOrThrow({ where: { id: p.invoiceId } });

  // What's left after any discount and earlier payments
  const remaining = invoiceBalance(invoice);
  if (p.amount > remaining) throw new OverpaymentError(`Overpayment detected. The balance is KES ${remaining}`);

  const [receiptNumber] = await nextDocumentNumbers(ctx, "FEES");
  const paid = Number(invoice.amountPaid) + p.amount;
  const status = invoiceStatusFor(paid, payableOf(invoice), invoice.dueDate);

  const finance = await ctx.finance.create({
    data: {
      amountPaid: p.amount,
      paymentDate: p.paymentDate,
      paymentType: p.paymentType,
      receiptNumber,
      collectedBy: p.collectedBy,
      notes: p.notes,
      athleteId: p.athleteId,
      invoiceId: invoice.id,
    },
  });
  await ctx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: paid, status } });

  const isInitial = invoice.description?.toLowerCase().includes("initial") || invoice.type === "SUBSCRIPTION";
  if (isInitial && status === "PAID") {
    await ctx.athlete.update({ where: { athleteId: p.athleteId }, data: { status: "ACTIVE" } });
  }
  return { finance, invoice };
}
