"use server";

import { auth } from "@/lib/auth";
import { ClientTrainingSessionSchema } from "../Validators/TrainingSessions";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { addMinutes } from "date-fns";
import z from "zod";

class TrainingConflictError extends Error {
  constructor() {
    super("Training session time conflict");
    this.name = "TrainingConflictError";
  }
}

export const CreateTrainingSession = async (
  data: z.input<typeof ClientTrainingSessionSchema>,
): Promise<ActionResult> => {
  const parsedData = ClientTrainingSessionSchema.parse(data);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized: Please log in.",
    };
  }

  try {
    const start = new Date(parsedData.date);
    const duration = parsedData.duration;
    const end = addMinutes(start, duration);

    await db.$transaction(async (tx) => {
      const batchOverlap = await tx.$queryRaw<unknown[]>`
    SELECT 1
    FROM training
    WHERE "batchesId" = ${parsedData.batch}
    AND (
      (date, date + (duration || ' minutes')::interval)
      OVERLAPS
      (${start}, ${end})
    )
    LIMIT 1;
  `;

      if (batchOverlap.length > 0) {
        throw new TrainingConflictError();
      }
      const coachOverlap = await tx.$queryRaw<unknown[]>`
    SELECT 1
    FROM training
    WHERE "staffId" = ${parsedData.coach}
    AND (
      (date, date + (duration || ' minutes')::interval)
      OVERLAPS
      (${start}, ${end})
    )
    LIMIT 1;
  `;

      if (coachOverlap.length > 0) {
        throw new TrainingConflictError();
      }

      const batchPlayers = await tx.athlete.findMany({
        where: { batchesId: parsedData.batch, isArchived: false },
        select: { id: true },
      });

      const athleteConnect = batchPlayers.map((a) => ({ id: a.id }));

      await tx.training.create({
        data: {
          name: parsedData.title,
          description: parsedData.description,
          date: start,
          duration,
          batchesId: parsedData.batch,
          note: parsedData.note,
          trainingLocationsId: parsedData.location,
          staffId: parsedData.coach,
          drills: {
            connect: parsedData.drills.map((dril) => ({
              id: dril,
            })),
          },
          athletes: {
            connect: athleteConnect,
          },
        },
      });
    });

    return {
      success: true,
      message: "Training session scheduled successfully.",
    };
  } catch (error) {
    if (error instanceof TrainingConflictError) {
      return {
        success: false,
        message:
          "This batch already has a scheduled session during this time range.",
      };
    }

    console.error("CreateTrainingSession error:", error);

    return {
      success: false,
      message: "Internal server error.",
    };
  }
};
