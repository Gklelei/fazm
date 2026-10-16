"use server";

import { hasRole } from "@/lib/roles";
import z from "zod";
import { ClientTrainingSessionSchema } from "@/features/trainings/schemas";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { addMinutes, isEqual } from "date-fns";
import { revalidatePath } from "next/cache";
import { createAuditLog, diffFields } from "@/lib/audit";
import { mayManageSession, NOT_YOUR_SESSION } from "@/features/trainings/lib/ownership";
import { ActionError, actionErrorMessage } from "@/lib/action";

export const EditTrainingSessionAction = async (
  data: z.input<typeof ClientTrainingSessionSchema>,
  id: string,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return { message: "Unauthorized access. Please login", success: false };

  if (!hasRole(session.user.role, "coaching"))
    return {
      message:
        "Unauthorized access. You are not allowed to perform this action",
      success: false,
    };

  const parsedInput = ClientTrainingSessionSchema.safeParse(data);
  if (!parsedInput.success) return { success: false, message: actionErrorMessage(parsedInput.error) };
  const {
    batch,
    coach,
    date,
    description,
    drills,
    duration,
    location,
    title,
    note,
  } = parsedInput.data;

  try {
    const before = await db.$transaction(async (ctx) => {
      const existingTraining = await ctx.training.findUnique({ where: { id } });
      if (!existingTraining) throw new ActionError("Training session does not exist");
      // A coach edits only their own sessions, and can't hand one to another coach
      if (!(await mayManageSession(session.user, existingTraining.staffId)) || !(await mayManageSession(session.user, coach))) {
        throw new ActionError(NOT_YOUR_SESSION);
      }

      const newStart = new Date(date);
      const newEnd = addMinutes(newStart, duration);

      const dateChanged =
        !isEqual(existingTraining.date, newStart) ||
        existingTraining.duration !== duration;

      if (dateChanged) {
        const [batchConflict, coachConflict] = await Promise.all([
          ctx.$queryRaw<{ conflict: number }[]>`
            SELECT 1 AS conflict
            FROM training
            WHERE "batchesId" = ${batch} AND id != ${id}
            AND (date, date + (duration || ' minutes')::interval) OVERLAPS (${newStart}, ${newEnd})
            LIMIT 1
          `,
          ctx.$queryRaw<{ conflict: number }[]>`
            SELECT 1 AS conflict
            FROM training
            WHERE "staffId" = ${coach} AND id != ${id}
            AND (date, date + (duration || ' minutes')::interval) OVERLAPS (${newStart}, ${newEnd})
            LIMIT 1
          `,
        ]);

        if (batchConflict.length > 0)
          throw new ActionError("Batch has another training at this time");

        if (coachConflict.length > 0)
          throw new ActionError("Coach has another training at this time");
      }

      // Validate related records
      const [batchExists, coachExists, locationExists, validDrills] =
        await Promise.all([
          ctx.batches.findUnique({ where: { id: batch } }),
          ctx.staff.findUnique({ where: { staffId: coach } }),
          ctx.trainingLocations.findUnique({ where: { id: location } }),
          ctx.drills.findMany({
            where: { id: { in: drills } },
            select: { id: true },
          }),
        ]);

      if (!batchExists) throw new ActionError("Batch does not exist");
      if (!coachExists) throw new ActionError("Coach does not exist");
      if (!locationExists) throw new ActionError("Location does not exist");

      await ctx.training.update({
        where: { id },
        data: {
          name: title,
          batchesId: batch,
          staffId: coach,
          trainingLocationsId: location,
          description,
          date: newStart,
          duration,
          note,
          drills:
            validDrills.length > 0
              ? { set: validDrills.map((d) => ({ id: d.id })) }
              : { set: [] },
          drillOrder: drills,
        },
      });
      return existingTraining;
    });

    revalidatePath("/sessions/view");
    await createAuditLog({
      action: "UPDATE_TRAINING_SESSION",
      resource: "TrainingSession",
      details: `Updated training session "${title}"`,
      userId: session.user.id,
      trainingId: id,
      changes: diffFields(
        { name: before.name, batchesId: before.batchesId, staffId: before.staffId, trainingLocationsId: before.trainingLocationsId, description: before.description, date: before.date.toISOString(), duration: before.duration, note: before.note, drillOrder: before.drillOrder },
        { name: title, batchesId: batch, staffId: coach, trainingLocationsId: location, description, date: new Date(date).toISOString(), duration, note, drillOrder: drills },
      ),
    });

    return { message: "Training session updated successfully", success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: actionErrorMessage(error),
    };
  }
};
