"use server";

import { applyPayment, OverpaymentError } from "@/features/finance/lib/apply-payment";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import { FinanceSchema, FinanceSchemaType } from "@/features/finance/schemas";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { inBackground } from "@/lib/background";
import { emailReceipt } from "@/features/invoices/lib/emails";

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
      const { finance } = await applyPayment(ctx, {
        invoiceId: existingInvoice.id,
        athleteId: existingUser.athleteId,
        amount: newPaymentAmount,
        paymentDate: new Date(parsedData.paymentDate),
        paymentType: parsedData.paymentType,
        collectedBy: parsedData.collectedBy,
        notes: parsedData.notes || "",
      });
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

    inBackground(() => emailReceipt(result.receiptNumber));

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
