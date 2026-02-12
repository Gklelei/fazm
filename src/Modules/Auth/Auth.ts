"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function ChangePassword({
  email,
  password,
}: {
  email: string;
  password: string;
  oldPassword: string;
}): Promise<ActionResult> {
  try {
    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!existingUser) {
      return {
        message: "User not found",
        success: false,
      };
    }

    await auth.api.setPassword({
      body: {
        newPassword: password,
      },
    });

    return {
      message: "Password reset succecifluuy",
      success: true,
    };
  } catch (error) {
    console.log({ error });

    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
}
