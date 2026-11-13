"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { inBackground } from "@/lib/background";
import { athleteName } from "@/features/athletes/lib/names";
import { athletePath } from "@/features/athletes/lib/athlete-links";
import { applyPlanChange } from "@/features/athletes/lib/plan-change";
import { planChangeSchema } from "@/features/athletes/schemas/plan-change";
import { emailInvoice } from "@/features/invoices/lib/emails";

const changePlanSchema = z.object({ athleteId: z.string().min(1), plan: planChangeSchema });
export type ChangePlanInput = z.input<typeof changePlanSchema>;

/**
 * Changes the plan of an athlete who has one (the profile's Fee plan tab): from the next bill,
 * from today with a new bill (the old bill kept, cancelled or credited), or stopped. Giving a
 * plan to someone without one is AddAthleteToSubscriptionPlan.
 */
export async function changeAthletePlan(input: ChangePlanInput) {
  return asRole("finance", async (user) => {
    const v = changePlanSchema.parse(input);
    if (v.plan.choice === "KEEP") throw new ActionError("Choose what happens to their plan.");
    const a = await db.athlete.findUnique({
      where: { athleteId: v.athleteId },
      select: { id: true, athleteId: true, firstName: true, middleName: true, lastName: true, isArchived: true, batches: { select: { programmeId: true } } },
    });
    if (!a || a.isArchived) throw new ActionError("That athlete no longer exists.");

    let plan = null;
    if (v.plan.choice !== "STOP") {
      plan = await db.subscriptionPlan.findFirst({
        where: { id: v.plan.planId, isActive: true, isArchived: false },
        select: { id: true, name: true, amount: true, interval: true, programmeId: true },
      });
      if (!plan) throw new ActionError("That fee plan is no longer available. Choose another.");
      if (plan.programmeId && plan.programmeId !== a.batches?.programmeId) {
        throw new ActionError(`${plan.name} is for another programme. Choose a plan for their batch.`);
      }
    }

    const result = await db.$transaction((tx) =>
      applyPlanChange(tx, {
        athleteId: a.athleteId,
        choice: v.plan.choice,
        plan,
        oldBill: v.plan.oldBill,
        oldInvoice: v.plan.oldInvoice,
        by: { id: user.id, email: user.email || "system" },
        now: new Date(),
      }),
    );

    const name = athleteName(a);
    await createAuditLog({
      action: "CHANGE_SUBSCRIPTION",
      resource: "Athlete",
      details: `Changed ${name}'s fee plan (${a.athleteId}): ${result.summary}`,
      userId: user.id,
      athleteId: a.id,
    });
    if (result.cancelled) {
      await createAuditLog({
        action: "CANCEL_INVOICE",
        resource: "Invoice",
        details: `Cancelled invoice ${result.cancelled.invoiceNumber} on changing ${name}'s fee plan`,
        userId: user.id,
        invoiceId: result.cancelled.id,
      });
    }
    if (result.invoiceNumber) {
      const number = result.invoiceNumber;
      inBackground(() => emailInvoice(number));
    }
    revalidatePath(athletePath(a.athleteId));
    revalidatePath("/invoices");
    const said = result.summary.charAt(0).toUpperCase() + result.summary.slice(1);
    return { success: true, message: `${said}.` };
  });
}
