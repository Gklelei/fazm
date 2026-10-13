"use server";

import { invoiceStatusFor } from "@/features/invoices/lib/status";
import { nextDocumentNumbers } from "@/lib/document-numbers";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import { FinanceSchema, FinanceSchemaType } from "@/features/finance/schemas";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";

type returnPromise =
  | { success: true; message: string; receiptNumber?: string }
  | { success: false; message: string };

class OverpaymentError extends Error {}

const createFinancialTransaction = async (
  data: FinanceSchemaType,
): Promise<returnPromise> => {
  const validation = FinanceSchema.safeParse(data);
  if (!validation.success) return { success: false, message: "Invalid data." };

  const parsedData = validation.data;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      success: false,
      message: "You must be logged in to perform this action.",
    };
  }

  if (!hasRole(session.user.role, "finance")) {
    return {
      success: false,
      message: "Access denied. This action requires administrator permissions.",
    };
  }

  try {
    const [existingUser, existingInvoice] = await Promise.all([
      db.athlete.findUnique({ where: { athleteId: parsedData.athleteId } }),
      db.invoice.findUnique({ where: { invoiceNumber: parsedData.invoiceId } }),
    ]);

    if (!existingUser || !existingInvoice) {
      return { success: false, message: "Athlete or Invoice not found." };
    }

    const newPaymentAmount = parseFloat(parsedData.amountPaid);

    const result = await db.$transaction(async (ctx) => {
      // Row lock: a second payment on this invoice waits here until this
      // one commits, so both can't start from the same balance.
      await ctx.$queryRaw`SELECT id FROM invoices WHERE id = ${existingInvoice.id} FOR UPDATE`;
      const currentInvoice = await ctx.invoice.findUniqueOrThrow({
        where: { id: existingInvoice.id },
      });

      const remainingBalance =
        Number(currentInvoice.amountDue) - Number(currentInvoice.amountPaid);

      if (newPaymentAmount > remainingBalance) {
        throw new OverpaymentError(
          `Overpayment detected. The balance is KES ${remainingBalance}`,
        );
      }

      const [generatedReceipt] = await nextDocumentNumbers(ctx, "FEES");

      const totalPaidSoFar =
        Number(currentInvoice.amountPaid) + newPaymentAmount;
      const newStatus = invoiceStatusFor(
        totalPaidSoFar,
        Number(currentInvoice.amountDue),
        currentInvoice.dueDate,
      );
      const isFullyPaid = newStatus === "PAID";

      const finance = await ctx.finance.create({
        data: {
          amountPaid: newPaymentAmount,
          paymentDate: new Date(parsedData.paymentDate),
          paymentType: parsedData.paymentType,
          receiptNumber: generatedReceipt,
          collectedBy: parsedData.collectedBy,
          notes: parsedData.notes || "",
          athleteId: existingUser.athleteId,
          invoiceId: currentInvoice.id,
        },
      });

      await ctx.invoice.update({
        where: { id: currentInvoice.id },
        data: { amountPaid: totalPaidSoFar, status: newStatus },
      });

      const isInitial =
        currentInvoice.description?.toLowerCase().includes("initial") ||
        currentInvoice.type === "SUBSCRIPTION";

      if (isInitial && isFullyPaid) {
        await ctx.athlete.update({
          where: { athleteId: existingUser.athleteId },
          data: { status: "ACTIVE" },
        });
      }

      return finance;
    });

    await createAuditLog({
      action: "CREATE_PAYMENT",
      resource: "Finance",
      details: `Generated receipt ${result.receiptNumber} for amount ${newPaymentAmount}`,
      userId: session.user.id,
      athleteId: existingUser.id,
      invoiceId: existingInvoice.id,
    });

    return {
      success: true,
      message: `Success! Receipt ${result.receiptNumber} generated.`,
      receiptNumber: result.receiptNumber,
    };
  } catch (error) {
    if (error instanceof OverpaymentError) {
      return { success: false, message: error.message };
    }
    console.error("[FINANCE_ERROR]:", error);
    return { success: false, message: "Database transaction failed." };
  }
};

export default createFinancialTransaction;
