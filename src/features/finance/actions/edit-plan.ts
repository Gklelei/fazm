"use server";

import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { hasRole } from "@/lib/roles";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog, diffFields } from "@/lib/audit";
import {
  SubscriptionsSchema,
  SubscriptionsSchemaType,
} from "@/features/finance/schemas/plans";
import { actionErrorMessage } from "@/lib/action";

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

    if (!hasRole(session.user.role, "finance")) {
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
    const before = await db.subscriptionPlan.findUnique({ where: { id } });
    const after = await db.subscriptionPlan.update({
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

    revalidatePath("/fees");
    lookupsChanged(LOOKUP.plans);

    await createAuditLog({
      action: "UPDATE_PLAN",
      resource: "SubscriptionPlan",
      details: `Updated fee plan "${after.name}"`,
      userId: session.user.id,
      recordId: id,
      changes: before
        ? diffFields(
            { ...before, amount: Number(before.amount) },
            { name: after.name, amount: Number(after.amount), interval: after.interval, description: after.description, isActive: after.isActive },
          )
        : null,
    });
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
      message: actionErrorMessage(error),
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

    if (!hasRole(session.user.role, "finance")) {
      return {
        success: false,
        message: "Unauthorized. Admin access required.",
      };
    }

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: {
        isArchived: true,
      },
    });

    revalidatePath("/fees");
    lookupsChanged(LOOKUP.plans);

    await createAuditLog({
      action: "ARCHIVE_PLAN",
      resource: "SubscriptionPlan",
      details: `Archived fee plan "${plan.name}"`,
      userId: session.user.id,
      recordId: id,
    });
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
      message: actionErrorMessage(error),
    };
  }
};
