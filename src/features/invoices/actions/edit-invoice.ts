"use server";

import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import {
  CreateInvoiceSchema,
  CreateInvoiceSchemaType,
} from "@/features/invoices/schemas";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { INVOICE_TYPE } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";

interface Props {
  data: CreateInvoiceSchemaType;
  invoiceId: string;
}

const calculateNextBillingDate = (
  startDate: Date,
  interval: string,
): Date | null => {
  const nextDate = new Date(startDate);
  switch (interval) {
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + 1);
      return nextDate;
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7);
      return nextDate;
    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1);
      return nextDate;
    case "ONCE":
    default:
      return null;
  }
};

const EditInvoiceAction = async ({
  data,
  invoiceId,
}: Props): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access.",
    };
  }

  if (!hasRole(session?.user.role, "finance")) {
    return {
      success: false,
      message: "Unauthorized access",
    };
  }

  try {
    const parsedData = CreateInvoiceSchema.parse(data);

    const invoiceResult = await db.$transaction(async (ctx) => {
      // 1. Fetch the invoice with its associated subscription instance
      const existingInvoice = await ctx.invoice.findUnique({
        where: { invoiceNumber: invoiceId },
        select: {
          id: true,
          athleteSubscriptionId: true,
        },
      });

      if (!existingInvoice) {
        throw new Error("Invoice does not exist");
      }

      const subAmount = parseFloat(parsedData.subScriptionAmount);

      const nextBilling = calculateNextBillingDate(
        new Date(parsedData.startDate || new Date()),
        parsedData.subscriptionInterval,
      );

      // 2. Update the Invoice
      await ctx.invoice.update({
        where: { invoiceNumber: invoiceId },
        data: {
          amountDue: subAmount,
          unitAmount: subAmount, // In your new schema, unitAmount * quantity = amountDue
          dueDate: new Date(parsedData.dueDate),
          description: parsedData.description,
          type: parsedData.subType as INVOICE_TYPE,
          nextBillingDate: nextBilling,
          periodStart: parsedData.startDate
            ? new Date(parsedData.startDate)
            : undefined,
          // Update the specific subscription instance if it exists
          athleteSubscription: existingInvoice.athleteSubscriptionId
            ? {
                update: {
                  currentPeriodEnd: nextBilling || new Date(),
                  // Note: If you want to change the plan itself, you'd update subscriptionPlanId here
                  // subscriptionPlanId:true
                },
              }
            : undefined,
        },
      });
      return existingInvoice;
    });

    revalidatePath("/fees"); // Revalidate where subscriptions are listed

    await createAuditLog({
      action: "UPDATE_INVOICE",
      resource: "Invoice",
      details: `Updated invoice parameters for ${invoiceId} (Amount: ${parsedData.subScriptionAmount})`,
      userId: session.user.id,
      invoiceId: invoiceResult.id,
    });

    return {
      success: true,
      message: "Invoice and Subscription record updated successfully",
    };
  } catch (error) {
    console.error("EditInvoiceAction Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};

export default EditInvoiceAction;
