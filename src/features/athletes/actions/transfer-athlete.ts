"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { athleteName } from "@/features/athletes/lib/names";
import { athletePath } from "@/features/athletes/lib/athlete-links";

const transferSchema = z.object({
  athleteId: z.string().min(1),
  toBatch: z.string().min(1, "Choose a batch"),
  subscriptionPlanId: z.string().min(1, "Choose a fee plan"),
  reason: z.string().trim().max(200, "Keep it under 200 characters").optional(),
});
export type TransferInput = z.input<typeof transferSchema>;

/**
 * Moves an athlete to a batch in another programme. They keep their ID and
 * every record; money billed so far stays with the old programme (stamped on
 * it). Nothing is billed now: their subscription moves to the new plan with the
 * same billing dates, invoices raised from now on are stamped with the new
 * programme, and plans for the old programme only no longer fit them.
 * Unmarked future sessions move with them.
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
        nextBillingDate: true,
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

    const plan = await db.subscriptionPlan.findFirst({
      where: { id: v.subscriptionPlanId, isActive: true, isArchived: false },
      select: { id: true, name: true, interval: true, programmeId: true },
    });
    if (!plan) throw new ActionError("That fee plan is no longer available. Choose another.");
    if (plan.programmeId && plan.programmeId !== to.programmeId) {
      throw new ActionError(`${plan.name} is for another programme. Choose a plan for ${to.programme.name}.`);
    }

    const now = new Date();
    await db.$transaction(async (tx) => {
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

      // The plan they're on now, keeping the period already billed
      const current = await tx.athleteSubscription.findFirst({
        where: { athleteId: a.athleteId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { subscriptionPlanId: true, currentPeriodStart: true, currentPeriodEnd: true },
      });
      if (current?.subscriptionPlanId !== plan.id) {
        await tx.athleteSubscription.updateMany({
          where: { athleteId: a.athleteId, status: "ACTIVE" },
          data: { status: "INACTIVE", endDate: now, autoRenew: false, cancelAtPeriodEnd: true, updatedBy: user.id },
        });
        await tx.athleteSubscription.create({
          data: {
            athleteId: a.athleteId,
            subscriptionPlanId: plan.id,
            status: "ACTIVE",
            startDate: now,
            autoRenew: plan.interval !== "ONCE",
            currentPeriodStart: current?.currentPeriodStart ?? now,
            currentPeriodEnd: current?.currentPeriodEnd ?? a.nextBillingDate ?? now,
            updatedBy: user.id,
          },
        });
      }

      // Registers: future sessions nobody has marked yet (the hourly sync does the same)
      const unmarked = { isArchived: false, status: "SCHEDULED" as const, date: { gt: now }, attendances: { none: {} } };
      const [leave, join] = await Promise.all([
        tx.training.findMany({ where: { ...unmarked, batchesId: a.batchesId, athletes: { some: { id: a.id } } }, select: { id: true } }),
        tx.training.findMany({ where: { ...unmarked, batchesId: to.id }, select: { id: true } }),
      ]);
      for (const s of leave) await tx.training.update({ where: { id: s.id }, data: { athletes: { disconnect: { id: a.id } } } });
      for (const s of join) await tx.training.update({ where: { id: s.id }, data: { athletes: { connect: { id: a.id } } } });
    });

    const name = athleteName(a);
    await createAuditLog({
      action: "TRANSFER_ATHLETE",
      resource: "Athlete",
      details: `Transferred ${name} (${a.athleteId}) from ${from.programme.name} ${from.name} to ${to.programme.name} ${to.name}, on ${plan.name}${v.reason ? `: ${v.reason}` : ""}`,
      userId: user.id,
      athleteId: a.id,
      changes: {
        before: { programme: from.programme.name, batch: from.name },
        after: { programme: to.programme.name, batch: to.name, plan: plan.name },
      },
    });
    revalidatePath("/players");
    revalidatePath(athletePath(a.athleteId));
    return { success: true, message: `${a.firstName} moved to ${to.programme.name} ${to.name}.` };
  });
}
