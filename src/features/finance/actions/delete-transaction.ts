"use server";

import { invoiceStatusFor } from "@/features/invoices/lib/status";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";

type returnPromise =
  { success: true; message: string } | { success: false; message: string };

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

  if (!hasRole(session.user.role, "finance")) {
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

    await db.$transaction(async (ctx) => {
      await ctx.finance.update({ where: { id }, data: { isArchived: true } });

      const invoiceId = existingTransaction.invoiceId;
      if (!invoiceId) return;

      // Lock + fresh read so a concurrent payment isn't overwritten
      await ctx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId} FOR UPDATE`;
      const invoice = await ctx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      const totalPaid = Math.max(
        0,
        Number(invoice.amountPaid) - Number(existingTransaction.amountPaid),
      );
      await ctx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: totalPaid,
          status: invoiceStatusFor(totalPaid, Number(invoice.amountDue), invoice.dueDate),
        },
      });
    });

    await createAuditLog({
      action: "DELETE_PAYMENT",
      resource: "Finance",
      details: `Soft deleted receipt ${existingTransaction.receiptNumber}`,
      userId: session.user.id,
      athleteId: existingTransaction.athleteId,
      invoiceId: existingTransaction.invoiceId ?? undefined,
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
