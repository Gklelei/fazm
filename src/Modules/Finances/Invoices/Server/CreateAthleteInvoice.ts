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

const toNumberAmount = (val: string) => {
  const n = Number(val);
  if (Number.isNaN(n)) throw new Error("Invalid amount");
  return n;
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
    const dueDate = new Date(parsedData.dueDate);

    await db.$transaction(async (tx) => {
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

      let todaysCount = await tx.invoice.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      });

      // 1) Resolve plan mode
      const isManual = parsedData.subType === "MANUAL";

      // If plan selected, fetch it once
      const selectedPlan = !isManual
        ? await tx.subscriptionPlan.findUnique({
            where: { id: parsedData.subType },
          })
        : null;

      if (!isManual && !selectedPlan) {
        throw new Error("Selected subscription plan does not exist");
      }

      // Manual mode: create an ad-hoc plan record (optional but consistent)
      // If you don't want to create plans for manual, skip this and just use parsedData.
      const manualPlan = isManual
        ? await tx.subscriptionPlan.create({
            data: {
              name: parsedData.subScriptionName,
              amount: toNumberAmount(parsedData.subScriptionAmount),
              interval: parsedData.subscriptionInterval,
              code: "",
              // nextBillingDate: calculateNextBillingDate(start, parsedData.subscriptionInterval) ?? null,
            },
          })
        : null;

      const planToUse = isManual ? manualPlan! : selectedPlan!;
      const invoiceType = isManual
        ? INVOICE_TYPE.MANUAL
        : INVOICE_TYPE.SUBSCRIPTION;

      // 2) Create invoices per athlete
      for (const athleteId of parsedData.athleteId) {
        const existingAthlete = await tx.athlete.findUnique({
          where: { athleteId },
        });

        if (!existingAthlete) throw new Error(`Athlete ${athleteId} not found`);

        todaysCount++;
        const invoiceSequence = todaysCount.toString().padStart(3, "0");
        const invoiceNumber = `INV-${datePart}-${invoiceSequence}`;

        await tx.invoice.create({
          data: {
            invoiceNumber,
            athleteId,
            dueDate,
            description: parsedData.description,

            // Use resolved plan amount
            amountDue: planToUse.amount,

            // If you have a relation, store subscriptionPlanId
            subscriptionPlanId: planToUse.id,

            // whatever your unitAmount is supposed to be; leaving your placeholder
            unitAmount: 3000,

            type: invoiceType,
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

    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

export default CreateAthleteInvoice;
