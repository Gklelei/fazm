"use server";

import { auth } from "@/lib/auth";
import { EditFinanceSchema, EditFinanceSchemaType } from "../Validators";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type returnPromise =
  | { success: true; message: string; receiptNumber?: string }
  | { success: false; message: string };

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

  if (session.user.role !== "ADMIN") {
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

    const existingInvoice = await db.invoice.findUnique({
      where: { id: existingTransaction.invoiceId! },
    });

    if (!existingInvoice) {
      return { success: false, message: "Associated invoice not found." };
    }

    const newPaymentAmount = parseFloat(parsedData.amountPaid);
    const oldPaymentAmount = Number(existingTransaction.amountPaid);

    // Check if new amount exceeds the actual remaining amount disregarding this existing transaction
    const baseAmountPaid =
      Number(existingInvoice.amountPaid) - oldPaymentAmount;
    const remainingBalance = Number(existingInvoice.amountDue) - baseAmountPaid;

    if (newPaymentAmount > remainingBalance) {
      return {
        success: false,
        message: `Overpayment detected. The maximum you can update to is KES ${remainingBalance}`,
      };
    }

    const result = await db.$transaction(async (ctx) => {
      const finance = await ctx.finance.update({
        where: { id: parsedData.id },
        data: {
          amountPaid: newPaymentAmount,
          paymentDate: new Date(parsedData.paymentDate),
          paymentType: parsedData.paymentType,
          collectedBy: parsedData.collectedBy,
          notes: parsedData.notes || "",
        },
      });

      const totalPaidSoFar = baseAmountPaid + newPaymentAmount;
      const isFullyPaid = totalPaidSoFar >= Number(existingInvoice.amountDue);
      const newStatus = isFullyPaid
        ? "PAID"
        : totalPaidSoFar > 0
          ? "PARTIAL"
          : "PENDING";

      await ctx.invoice.update({
        where: { id: existingInvoice.id },
        data: { amountPaid: totalPaidSoFar, status: newStatus },
      });

      return finance;
    });

    await createAuditLog({
      action: "UPDATE_PAYMENT",
      resource: "Finance",
      details: `Updated receipt ${result.receiptNumber} amount to ${newPaymentAmount}`,
      userId: session.user.id,
      athleteId: existingTransaction.athleteId,
      invoiceId: existingInvoice.id,
    });

    await revalidatePath("/transactions");

    return {
      success: true,
      message: `Success! Receipt ${result.receiptNumber} updated.`,
      receiptNumber: result.receiptNumber,
    };
  } catch (error) {
    console.error("[FINANCE_UPDATE_ERROR]:", error);
    return { success: false, message: "Database transaction failed." };
  }
};

export default editFinancialTransaction;
