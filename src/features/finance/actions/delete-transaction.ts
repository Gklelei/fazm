"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";

type returnPromise =
  | { success: true; message: string }
  | { success: false; message: string };

const deleteFinancialTransaction = async (
  id: string,
): Promise<returnPromise> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      success: false,
      message: "You must be logged in to perform this action.",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Access denied. This action requires administrator permissions.",
    };
  }

  try {
    const existingTransaction = await db.finance.findUnique({
      where: { id, isArchived: false },
    });

    if (!existingTransaction) {
      return {
        success: false,
        message: "Transaction not found or already deleted.",
      };
    }

    const existingInvoice = await db.invoice.findUnique({
      where: { id: existingTransaction.invoiceId! },
    });

    if (!existingInvoice) {
      return { success: false, message: "Associated invoice not found." };
    }

    const paymentAmount = Number(existingTransaction.amountPaid);

    await db.$transaction(async (ctx) => {
      // Soft delete transaction
      await ctx.finance.update({
        where: { id },
        data: {
          isArchived: true,
        },
      });

      // Update invoice base amount and status
      const newTotalPaid = Number(existingInvoice.amountPaid) - paymentAmount;
      const newStatus = newTotalPaid > 0 ? "PARTIAL" : "PENDING";

      await ctx.invoice.update({
        where: { id: existingInvoice.id },
        data: { amountPaid: newTotalPaid, status: newStatus },
      });
    });

    await createAuditLog({
      action: "DELETE_PAYMENT",
      resource: "Finance",
      details: `Soft deleted receipt ${existingTransaction.receiptNumber}`,
      userId: session.user.id,
      athleteId: existingTransaction.athleteId,
      invoiceId: existingInvoice.id,
    });

    return {
      success: true,
      message: `Success! Receipt ${existingTransaction.receiptNumber} deleted.`,
    };
  } catch (error) {
    console.error("[FINANCE_DELETE_ERROR]:", error);
    return { success: false, message: "Database transaction failed." };
  }
};

export default deleteFinancialTransaction;
