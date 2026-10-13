"use server";

import { nextDocumentNumbers } from "@/lib/document-numbers";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import {
  CreateInvoiceSchema,
  CreateInvoiceSchemaType,
} from "@/features/invoices/schemas";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { INVOICE_TYPE } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";



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

  if (!hasRole(session.user.role, "finance")) {
    return { success: false, message: "Unauthorized access" };
  }

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

        const [invoiceNumber] = await nextDocumentNumbers(tx, "INV", 1, now);

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

    revalidatePath("/invoices");

    await createAuditLog({
      action: "CREATE_INVOICES",
      resource: "Invoice",
      details: `Created manual/subscription invoices for ${parsed.athleteId.length} athletes.`,
      userId: session.user.id,
    });

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
