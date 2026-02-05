"use server";

import { auth } from "@/lib/auth";
import { CreateInvoiceSchema, CreateInvoiceSchemaType } from "../Validators";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { INVOICE_TYPE } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toDecimal(val: string | number | Prisma.Decimal) {
  if (val instanceof Prisma.Decimal) return val.toDecimalPlaces(2);
  const n = typeof val === "string" ? Number(val) : val;
  if (Number.isNaN(n)) throw new Error("Invalid amount");
  return new Prisma.Decimal(n).toDecimalPlaces(2);
}

async function CreateAthleteInvoice(
  data: CreateInvoiceSchemaType,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, message: "Unauthorized access" };

  try {
    const parsed = CreateInvoiceSchema.parse(data);

    const dueDate = new Date(parsed.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new Error("Invalid due date");

    const periodStart = parsed.startDate ? new Date(parsed.startDate) : null;
    if (periodStart && Number.isNaN(periodStart.getTime())) {
      throw new Error("Invalid start date");
    }

    await db.$transaction(async (tx) => {
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const sDay = startOfDay(now);
      const eDay = endOfDay(now);

      let todaysCount = await tx.invoice.count({
        where: { createdAt: { gte: sDay, lte: eDay } },
      });

      const isManual = parsed.subType === "MANUAL";

      const selectedPlan = !isManual
        ? await tx.subscriptionPlan.findFirst({
            where: { id: parsed.subType, isActive: true, isArchived: false },
            select: { id: true, name: true, amount: true, interval: true },
          })
        : null;

      if (!isManual && !selectedPlan) {
        throw new Error("Selected subscription plan does not exist");
      }

      const invoiceType = isManual
        ? INVOICE_TYPE.MANUAL
        : INVOICE_TYPE.SUBSCRIPTION;

      // ✅ Make amountDue ALWAYS Decimal (manual or plan)
      const amountDue = isManual
        ? toDecimal(parsed.subScriptionAmount)
        : toDecimal(selectedPlan!.amount);

      // If qty is always 1, unitAmount == amountDue
      const unitAmount = amountDue;

      for (const athleteId of parsed.athleteId) {
        const athlete = await tx.athlete.findUnique({ where: { athleteId } });
        if (!athlete) throw new Error(`Athlete ${athleteId} not found`);

        todaysCount += 1;
        const invoiceSequence = String(todaysCount).padStart(3, "0");
        const invoiceNumber = `INV-${datePart}-${invoiceSequence}`;

        await tx.invoice.create({
          data: {
            invoiceNumber,
            athleteId,
            dueDate,
            description: parsed.description,

            type: invoiceType,

            unitAmount, // Decimal
            quantity: 1,
            amountDue, // Decimal
            amountPaid: new Prisma.Decimal(0), // ✅ Decimal
            status: "PENDING",

            subscriptionPlanId: isManual ? null : selectedPlan!.id,

            periodStart,
            periodEnd: null,

            isRecurring: false,
            issuedBy: session.user.email ?? "system",
          },
        });
      }
    });

    revalidatePath("/finances/invoice");

    return {
      success: true,
      message: `Invoices created successfully for ${parsed.athleteId.length} athletes`,
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
