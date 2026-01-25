"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  SubscriptionsSchema,
  SubscriptionsSchemaType,
} from "../Validators/Subs";

export const UpdateSubscriptionPlan = async ({
  data,
  id,
}: {
  data: SubscriptionsSchemaType;
  id: string;
}): Promise<ActionResult> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access, please login first",
      };
    }

    if (session.user.role !== "ADMIN") {
      return { success: false, message: "Unauthorized access." };
    }

    // 1. Validate incoming data
    const parsedData = SubscriptionsSchema.parse(data);

    // 2. Generate the new code based on the potentially new name
    const generateCode = (name: string) => {
      return name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
    };

    const newSubscriptionCode = generateCode(parsedData.name);

    // 3. Check if this code is already taken by a DIFFERENT plan
    const duplicatePlan = await db.subscriptionPlan.findFirst({
      where: {
        code: newSubscriptionCode,
        NOT: {
          id: id, // Important: Don't flag the plan we are currently editing
        },
      },
    });

    if (duplicatePlan) {
      return {
        success: false,
        message: `The name "${parsedData.name}" generates a code (${newSubscriptionCode}) that is already in use. Please choose a more unique name.`,
      };
    }

    // 4. Proceed with update
    await db.subscriptionPlan.update({
      where: { id },
      data: {
        name: parsedData.name,
        code: newSubscriptionCode,
        amount: parsedData.amount,
        interval: parsedData.interval,
        description: parsedData.description || null,
        isActive: parsedData.status === "ACTIVE",
      },
    });

    revalidatePath("/finances/fees");

    return {
      success: true,
      message: "Subscription updated successfully",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("UpdateSubscriptionPlan error:", error);

    // Handle Prisma's "Record not found" error
    if (error.code === "P2025") {
      return { success: false, message: "Subscription plan not found." };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};

export const archiveSubscriptionPlan = async (
  id: string,
): Promise<ActionResult> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, message: "Unauthorized access. Please login." };
    }

    if (session.user.role !== "ADMIN") {
      return {
        success: false,
        message: "Unauthorized. Admin access required.",
      };
    }

    await db.subscriptionPlan.update({
      where: { id },
      data: {
        isArchived: true,
      },
    });

    revalidatePath("/finances/fees");

    return {
      success: true,
      message: "Subscription plan archived successfully.",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Archive Error:", error);

    if (error instanceof Error) {
      console.log({ error });
    }

    if (error.code === "P2025") {
      return { success: false, message: "Subscription plan not found." };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
