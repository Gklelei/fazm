"use server";

import { invoiceStatusFor } from "@/features/invoices/lib/status";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import {
  EditFinanceSchema,
  EditFinanceSchemaType,
} from "@/features/finance/schemas";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type returnPromise =
  | { success: true; message: string; receiptNumber?: string }
  | { success: false; message: string };

class OverpaymentError extends Error {}

const editFinancialTransaction = async (
  data: EditFinanceSchemaType,
): Promise<returnPromise> => {
  const validation = EditFinanceSchema.safeParse(data);
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
    const existingTransaction = await db.finance.findUnique({
      where: { id: parsedData.id, isArchived: false },
    });
    if (!existingTransaction) {
      return { success: false, message: "Transaction not found or deleted." };
    }

    const newPaymentAmount = Number(parsedData.amountPaid);
    const paymentFields = {
      amountPaid: newPaymentAmount,
      paymentDate: new Date(parsedData.paymentDate),
      paymentType: parsedData.paymentType,
      collectedBy: parsedData.collectedBy,
      notes: parsedData.notes || "",
    };

    const result = await db.$transaction(async (ctx) => {
      const invoiceId = existingTransaction.invoiceId;
      if (!invoiceId) {
        // A payment not tied to an invoice has no balance to keep in step
        return ctx.finance.update({ where: { id: parsedData.id }, data: paymentFields });
      }

      // Lock the invoice, then read both rows fresh, so concurrent payments
      // or edits on this invoice can't overwrite each other's balance.
      await ctx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
      const [invoice, current] = await Promise.all([
        ctx.invoice.findUniqueOrThrow({ where: { id: invoiceId } }),
        ctx.finance.findUniqueOrThrow({ where: { id: parsedData.id } }),
      ]);

      const paidByOthers = Number(invoice.amountPaid) - Number(current.amountPaid);
      const maxAllowed = Number(invoice.amountDue) - paidByOthers;
      if (newPaymentAmount > maxAllowed) {
        throw new OverpaymentError(
          `That would overpay the invoice. The most this payment can be is KES ${maxAllowed}.`,
        );
      }

      const finance = await ctx.finance.update({
        where: { id: parsedData.id },
        data: paymentFields,
      });

      const totalPaid = paidByOthers + newPaymentAmount;
      await ctx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: totalPaid,
          status: invoiceStatusFor(totalPaid, Number(invoice.amountDue), invoice.dueDate),
        },
      });

      return finance;
    });

    await createAuditLog({
      action: "UPDATE_PAYMENT",
      resource: "Finance",
      details: `Updated receipt ${result.receiptNumber} amount to ${newPaymentAmount}`,
      userId: session.user.id,
      athleteId: existingTransaction.athleteId,
      invoiceId: existingTransaction.invoiceId ?? undefined,
    });

    await revalidatePath("/transactions");

    return {
      success: true,
      message: `Success! Receipt ${result.receiptNumber} updated.`,
      receiptNumber: result.receiptNumber,
    };
  } catch (error) {
    if (error instanceof OverpaymentError) {
      return { success: false, message: error.message };
    }
    console.error("[FINANCE_UPDATE_ERROR]:", error);
    return { success: false, message: "Database transaction failed." };
  }
};

export default editFinancialTransaction;
