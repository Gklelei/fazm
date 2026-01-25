"use server";

import { auth } from "@/lib/auth";
import { CreateStaffSchema, CreateStaffSchemaType } from "../Validation";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  message: string;
};

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

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Access denied. This action requires administrator permissions.",
    };
  }

  const parsedData = CreateStaffSchema.parse(data);

  try {
    const { user } = await auth.api.signUpEmail({
      body: {
        email: parsedData.email,
        name: parsedData.fullName,
        password: parsedData.password,
        image: parsedData.image,
        role: parsedData.role,
      },
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

    revalidatePath("/users/staff");

    return { success: true, message: "User created successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Internal server error" };
  }
};
