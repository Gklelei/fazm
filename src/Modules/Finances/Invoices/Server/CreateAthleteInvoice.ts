"use server";

import { auth } from "@/lib/auth";
import { CreateInvoiceSchema, CreateInvoiceSchemaType } from "../Validators";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { INVOICE_TYPE } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

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

async function CreateAthleteInvoice(
  data: CreateInvoiceSchemaType,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { success: false, message: "Unauthorized access" };
  }

  try {
    const parsedData = CreateInvoiceSchema.parse(data);

    const start = new Date(parsedData.startDate);
    const nextBilling = calculateNextBillingDate(
      start,
      parsedData.subscriptionInterval,
    );

    await db.$transaction(async (tx) => {
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

      let todaysCount = await tx.invoice.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      });

      for (const id of parsedData.athleteId) {
        const existingAthlete = await tx.athlete.findUnique({
          where: { athleteId: id },
        });
        if (!existingAthlete) throw new Error(`Athlete ${id} not found`);

        todaysCount++;
        const invoiceSequence = todaysCount.toString().padStart(3, "0");
        const generatedReceipt = `INV-${datePart}-${invoiceSequence}`;

        const sub = await tx.subscriptionPlan.create({
          data: {
            amount: parseInt(parsedData.subScriptionAmount),
            interval: parsedData.subscriptionInterval as
              | "MONTHLY"
              | "WEEKLY"
              | "DAILY"
              | "ONCE",
            name: parsedData.subScriptionName,
            code: "",
            // nextBillingDate: nextBilling || new Date(),
            // athleteId: id,
          },
        });
        await tx.invoice.create({
          data: {
            amountDue: sub.amount,
            dueDate: new Date(parsedData.dueDate),
            invoiceNumber: generatedReceipt,
            description: parsedData.description,
            // subscriptionId: sub.id,
            unitAmount: 3000,
            athleteId: id,
            type: parsedData.subType as INVOICE_TYPE,
          },
        });
      }
    });
    revalidatePath("/finances/invoice");
    return {
      success: true,
      message: `Invoices created successfully for ${parsedData.athleteId.length} athletes`,
    };
  } catch (error) {
    console.error("SERVER_ACTION_ERROR:", error);

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
}

export default CreateAthleteInvoice;
