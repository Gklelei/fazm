"use server";

import { auth } from "@/lib/auth";
import { CreateInvoiceSchema, CreateInvoiceSchemaType } from "../Validators";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { INVOICE_TYPE } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

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

  if (session?.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Unauthorized access",
    };
  }

  try {
    const parsedData = CreateInvoiceSchema.parse(data);

    await db.$transaction(async (ctx) => {
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
    });

    revalidatePath("/finances/invoice");
    revalidatePath("/finances/fees"); // Revalidate where subscriptions are listed

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

export const EditInvoiceStatus = async (
  status: Partial<"PENDING" | "PARTIAL" | "PAID" | "CANCELED" | "OVERDUE">,
  id: string,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access.",
    };
  }
  try {
    await db.$transaction(async (ctx) => {
      const existingInvoice = await ctx.invoice.findUnique({
        where: {
          invoiceNumber: id,
        },
      });

      if (!existingInvoice) {
        throw new Error("Invoice Does not exit");
      }

      await ctx.invoice.update({
        where: {
          invoiceNumber: id,
        },
        data: {
          status,
        },
      });
    });

    revalidatePath("/finances/invoice");
    return {
      success: true,
      message: "Invoice status Updated succecifully",
    };
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "Internal server error",
    };
  }
};

export default EditInvoiceAction;
