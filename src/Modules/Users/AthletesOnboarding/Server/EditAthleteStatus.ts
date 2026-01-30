"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";

type UiStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

type DbStatus = "PENDING" | "ACTIVE" | "DEACTIVATED";

const UI_TO_DB_STATUS: Record<UiStatus, DbStatus> = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "DEACTIVATED",
};

export const UpdateAthleteStatus = async ({
  athleteId,
  status,
}: {
  athleteId: string;
  status: UiStatus;
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "You must be logged in to perform this action.",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Access denied. This action requires administrator permissions.",
    };
  }
  try {
    const dbStatus = UI_TO_DB_STATUS[status];
    if (!dbStatus) {
      return { success: false, message: "Invalid status value" };
    }

    const existingAthlete = await db.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true },
    });

    if (!existingAthlete) {
      return { success: false, message: "Athlete not found" };
    }

    await db.athlete.update({
      where: { id: athleteId },
      data: { status: dbStatus },
    });

    return { success: true, message: "Athlete updated successfully" };
  } catch (error) {
    console.log({ error });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
