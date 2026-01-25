"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export const DeleteTrainingSession = async (
  id: string,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const allowedRoles = ["ADMIN", "COACH"];

  if (!allowedRoles.includes(session?.user.role ?? "")) {
    return {
      success: false,
      message: "You are not allowed to perform this operation",
    };
  }
  try {
    const existingTrainingSession = await db.training.findUnique({
      where: {
        id,
      },
    });

    if (!existingTrainingSession) {
      return {
        message: "Training session does not exist",
        success: false,
      };
    }

    await db.training.update({
      where: {
        id,
      },
      data: {
        isArchived: true,
      },
    });
    revalidatePath("/training/sessions");
    return {
      success: true,
      message: "Training session deleted succecifully",
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
