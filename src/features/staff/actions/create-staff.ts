"use server";

import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import {
  CreateStaffSchema,
  CreateStaffSchemaType,
} from "@/features/staff/schemas";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { APIError } from "better-auth";
import { createAuditLog } from "@/lib/audit";

export const CreateStaffAction = async (
  data: CreateStaffSchemaType,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      success: false,
      message: "You must be logged in to perform this action.",
    };
  }

  if (!hasRole(session.user.role, "admin")) {
    return {
      success: false,
      message: "Access denied. This action requires administrator permissions.",
    };
  }

  const parsed = CreateStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const parsedData = parsed.data;

  // Only a super admin can create another super admin
  if (parsedData.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return { success: false, message: "Only a super admin can create a super admin." };
  }

  let createdUserId: string | null = null;
  try {
    const { user } = await auth.api.signUpEmail({
      body: {
        email: parsedData.email,
        name: parsedData.fullName,
        password: parsedData.password,
        image: parsedData.image,
      },
    });

    createdUserId = user.id;

    // `role` is not accepted as client-settable input on the auth API (see
    // src/lib/auth.ts), so it is set here via a direct, server-only DB write.
    // The admin chose the first password, so the new member must replace it.
    await db.user.update({
      where: { id: user.id },
      data: { role: parsedData.role, mustChangePassword: true },
    });

    const ACADEMY_PREFIX = "STAFF-FFA";

    await db.staff.create({
      data: {
        fullNames: parsedData.fullName,
        userId: user.id,
        staffId: `${ACADEMY_PREFIX}-${Math.floor(1000 + Math.random() * 9000)}`,
        phoneNumber: parsedData.phoneNumber,
      },
    });

    revalidatePath("/staff");

    await createAuditLog({
      action: "CREATE_STAFF",
      resource: "Staff",
      details: `Created staff profile for ${parsedData.fullName}`,
      userId: session.user.id,
    });

    return { success: true, message: "User created successfully" };
  } catch (error) {
    console.error(error);
    // Don't leave a half-made account behind (it would carry the default role)
    if (createdUserId) {
      await db.user.delete({ where: { id: createdUserId } }).catch(() => undefined);
    }
    return {
      success: false,
      message:
        error instanceof APIError ? error.message : "Couldn't create the account. Try again.",
    };
  }
};
