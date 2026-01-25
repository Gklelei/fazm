"use server";

import z from "zod";
import { ClientTrainingSessionSchema } from "../Validators/TrainingSessions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { addMinutes, isEqual } from "date-fns";
import { revalidatePath } from "next/cache";

export const EditTrainingSessionAction = async (
  data: z.input<typeof ClientTrainingSessionSchema>,
  id: string,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return { message: "Unauthorized access. Please login", success: false };

  if (session.user.role !== "ADMIN" && session.user.role !== "COACH")
    return {
      message:
        "Unauthorized access. You are not allowed to perform this action",
      success: false,
    };

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
  } = ClientTrainingSessionSchema.parse(data);

  try {
    await db.$transaction(async (ctx) => {
      const existingTraining = await ctx.training.findUnique({ where: { id } });
      if (!existingTraining) throw new Error("Training session does not exist");

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
          throw new Error("Batch has another training at this time");

        if (coachConflict.length > 0)
          throw new Error("Coach has another training at this time");
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

      if (!batchExists) throw new Error("Batch does not exist");
      if (!coachExists) throw new Error("Coach does not exist");
      if (!locationExists) throw new Error("Location does not exist");

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
        },
      });
    });

    revalidatePath("/training/sessions/view");

    return { message: "Training session updated successfully", success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
