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

const transferSchema = z.object({
  athleteId: z.string().min(1),
  toBatch: z.string().min(1, "Choose a batch"),
  plan: planChangeSchema,
  reason: z.string().trim().max(200, "Keep it under 200 characters").optional(),
});
export type TransferInput = z.input<typeof transferSchema>;

/**
 * Moves an athlete to a batch in another programme. They keep their ID and every record; money
 * billed so far stays with the old programme (stamped on it). Their fee plan changes as staff
 * chose (from the next bill, from today with a new bill, kept, or stopped; see
 * lib/plan-change.ts); a bill raised now is stamped with the new programme. Unmarked future
 * sessions move with them.
 */
export async function transferAthlete(input: TransferInput) {
  return asRole("admin", async (user) => {
    const v = transferSchema.parse(input);
    const a = await db.athlete.findUnique({
      where: { athleteId: v.athleteId },
      select: {
        id: true,
        athleteId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        isArchived: true,
        batchesId: true,
        batches: { select: { name: true, programmeId: true, programme: { select: { name: true } } } },
      },
    });
    if (!a || a.isArchived) throw new ActionError("That athlete no longer exists.");
    const from = a.batches;
    if (!from) throw new ActionError("Put them in a batch first, from Edit details.");

    const to = await db.batches.findFirst({
      where: { id: v.toBatch, isArchived: false, programme: { isArchived: false } },
      select: { id: true, name: true, programmeId: true, programme: { select: { name: true } } },
    });
    if (!to) throw new ActionError("That batch is no longer available. Choose another.");
    if (to.programmeId === from.programmeId) {
      throw new ActionError(`Choose a batch outside ${from.programme.name}, or change their batch from Edit details.`);
    }

    // The fee plan must fit the programme they're joining
    const fits = (programmeId: string | null) => !programmeId || programmeId === to.programmeId;
    let plan = null;
    if (v.plan.choice === "NEXT_BILL" || v.plan.choice === "RESTART") {
      plan = await db.subscriptionPlan.findFirst({
        where: { id: v.plan.planId, isActive: true, isArchived: false },
        select: { id: true, name: true, amount: true, interval: true, programmeId: true },
      });
      if (!plan) throw new ActionError("That fee plan is no longer available. Choose another.");
      if (!fits(plan.programmeId)) throw new ActionError(`${plan.name} is for another programme. Choose a plan for ${to.programme.name}.`);
    }
    if (v.plan.choice === "KEEP") {
      const current = await db.athleteSubscription.findFirst({
        where: { athleteId: a.athleteId, status: "ACTIVE" },
        select: { subscriptionPlan: { select: { name: true, programmeId: true } } },
      });
      if (!current) throw new ActionError("They have no plan to keep. Choose a plan for the new programme.");
      if (!fits(current.subscriptionPlan.programmeId)) {
        throw new ActionError(`${current.subscriptionPlan.name} is for ${from.programme.name} only. Choose a plan for ${to.programme.name}.`);
      }
    }

    const now = new Date();
    const result = await db.$transaction(async (tx) => {
      // The batch first: anything billed from here on is stamped with the new programme
      await tx.athlete.update({ where: { id: a.id }, data: { batchesId: to.id } });
      await tx.athleteTransfer.create({
        data: {
          athleteId: a.id,
          fromBatchId: a.batchesId,
          toBatchId: to.id,
          fromProgrammeId: from.programmeId,
          toProgrammeId: to.programmeId,
          date: now,
          reason: v.reason || null,
          byUserId: user.id,
        },
      });

      const planned = await applyPlanChange(tx, {
        athleteId: a.athleteId,
        choice: v.plan.choice,
        plan,
        oldBill: v.plan.oldBill,
        oldInvoice: v.plan.oldInvoice,
        by: { id: user.id, email: user.email || "system" },
        now,
      });

      // Registers: future sessions nobody has marked yet (the hourly sync does the same)
      const unmarked = { isArchived: false, status: "SCHEDULED" as const, date: { gt: now }, attendances: { none: {} } };
      const [leave, join] = await Promise.all([
        tx.training.findMany({ where: { ...unmarked, batchesId: a.batchesId, athletes: { some: { id: a.id } } }, select: { id: true } }),
        tx.training.findMany({ where: { ...unmarked, batchesId: to.id }, select: { id: true } }),
      ]);
      for (const s of leave) await tx.training.update({ where: { id: s.id }, data: { athletes: { disconnect: { id: a.id } } } });
      for (const s of join) await tx.training.update({ where: { id: s.id }, data: { athletes: { connect: { id: a.id } } } });
      return planned;
    });

    const name = athleteName(a);
    await createAuditLog({
      action: "TRANSFER_ATHLETE",
      resource: "Athlete",
      details: `Transferred ${name} (${a.athleteId}) from ${from.programme.name} ${from.name} to ${to.programme.name} ${to.name}; fee plan: ${result.summary}${v.reason ? `. Reason: ${v.reason}` : ""}`,
      userId: user.id,
      athleteId: a.id,
      changes: {
        before: { programme: from.programme.name, batch: from.name },
        after: { programme: to.programme.name, batch: to.name },
      },
    });
    if (result.cancelled) {
      await createAuditLog({
        action: "CANCEL_INVOICE",
        resource: "Invoice",
        details: `Cancelled invoice ${result.cancelled.invoiceNumber} on transferring ${name}`,
        userId: user.id,
        invoiceId: result.cancelled.id,
      });
    }
    if (result.invoiceNumber) {
      const number = result.invoiceNumber;
      inBackground(() => emailInvoice(number));
    }
    revalidatePath("/players");
    revalidatePath("/invoices");
    revalidatePath(athletePath(a.athleteId));
    return { success: true, message: `${a.firstName} moved to ${to.programme.name} ${to.name}.` };
  });
}
