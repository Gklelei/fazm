"use server";

import { AttendanceStatus } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type SaveAttendanceInput = {
  athleteId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatus;
  reasonId: string | null;
}[];

type ActionResult = {
  success: boolean;
  message: string;
};

export async function saveAttendance(
  input: SaveAttendanceInput,
  trainingId: string,
  coachId: string,
): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access",
    };
  }

  try {
    await db.$transaction(async (ctx) => {
      const existingTraining = await ctx.training.findUnique({
        where: { id: trainingId },
      });

      if (!existingTraining) {
        throw new Error("Training session does not exist");
      }

      const athleteIds = input.map((a) => a.athleteId);

      const athletesInTraining = await ctx.athlete.findMany({
        where: {
          athleteId: { in: athleteIds },
          trainings: {
            some: { id: trainingId },
          },
        },
        select: { athleteId: true },
      });

      const validAthleteIds = new Set(
        athletesInTraining.map((a) => a.athleteId),
      );
      const invalidAthletes = athleteIds.filter(
        (id) => !validAthleteIds.has(id),
      );

      if (invalidAthletes.length > 0) {
        throw new Error(
          `Athletes not assigned to training: ${invalidAthletes.join(", ")}`,
        );
      }

      const upsertPromises = input.map((a) =>
        ctx.attendance.upsert({
          where: {
            trainingId_athleteId: {
              athleteId: a.athleteId,
              trainingId: trainingId,
            },
          },
          create: {
            status: a.status,
            athleteId: a.athleteId,
            trainingId: trainingId,
            reasonId: a.reasonId,
            coachId: coachId,
          },
          update: {
            reasonId: a.reasonId,
            status: a.status,
          },
        }),
      );

      await Promise.all(upsertPromises);
    });

    revalidatePath(`/training/sessions/attendance/mark/${trainingId}`);

    return {
      success: true,
      message: `Attendance updated successfully`,
    };
  } catch (error) {
    console.error("Attendance save error:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "Internal Server Error",
    };
  }
}
