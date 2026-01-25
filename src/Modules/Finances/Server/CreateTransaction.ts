"use server";

import { auth } from "@/lib/auth";
import { FinanceSchema, FinanceSchemaType } from "../Validators";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";

type returnPromise =
  | { success: true; message: string; receiptNumber?: string }
  | { success: false; message: string };

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

  if (session.user.role !== "ADMIN") {
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
    const remainingBalance =
      existingInvoice.amountDue - existingInvoice.amountPaid;

    if (newPaymentAmount > remainingBalance) {
      return {
        success: false,
        message: `Overpayment detected. The balance is KES ${remainingBalance}`,
      };
    }

    const result = await db.$transaction(async (ctx) => {
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );

      const todaysCount = await ctx.finance.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      });

      const sequence = (todaysCount + 1).toString().padStart(3, "0");
      const generatedReceipt = `FEES-${datePart}-${sequence}`;

      const totalPaidSoFar = existingInvoice.amountPaid + newPaymentAmount;
      const isFullyPaid = totalPaidSoFar >= existingInvoice.amountDue;
      const newStatus = isFullyPaid ? "PAID" : "PARTIAL";

      const finance = await ctx.finance.create({
        data: {
          amountPaid: newPaymentAmount,
          paymentDate: new Date(parsedData.paymentDate),
          paymentType: parsedData.paymentType,
          receiptNumber: generatedReceipt,
          collectedBy: parsedData.collectedBy,
          notes: parsedData.notes || "",
          athleteId: existingUser.athleteId,
          invoiceId: existingInvoice.id,
        },
      });

      await ctx.invoice.update({
        where: { id: existingInvoice.id },
        data: { amountPaid: totalPaidSoFar, status: newStatus },
      });

      const isInitial =
        existingInvoice.description?.toLowerCase().includes("initial") ||
        existingInvoice.type === "SUBSCRIPTION";

      if (isInitial && isFullyPaid) {
        await ctx.athlete.update({
          where: { athleteId: existingUser.athleteId },
          data: { status: "ACTIVE" },
        });
      }

      return finance;
    });

    return {
      success: true,
      message: `Success! Receipt ${result.receiptNumber} generated.`,
      receiptNumber: result.receiptNumber,
    };
  } catch (error) {
    console.error("[FINANCE_ERROR]:", error);
    return { success: false, message: "Database transaction failed." };
  }
};

export default createFinancialTransaction;
