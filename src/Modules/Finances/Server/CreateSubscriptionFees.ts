"use server";

import { auth } from "@/lib/auth";
import {
  SubscriptionsSchema,
  SubscriptionsSchemaType,
} from "../Validators/Subs";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";

export const CreateSubscriptionFees = async (
  data: SubscriptionsSchemaType,
): Promise<ActionResult> => {
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
      return {
        message:
          "Unauthorized access, you are not allowed to perform this action",
        success: false,
      };
    }

    const parsedData = SubscriptionsSchema.parse(data);

    const generateCode = (name: string) => {
      return name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
    };

    const subscriptionCode = generateCode(parsedData.name);

    const existingPlan = await db.subscriptionPlan.findUnique({
      where: { code: subscriptionCode },
    });

    if (existingPlan) {
      return {
        success: false,
        message: `A subscription plan with code "${subscriptionCode}" already exists. Please use a different name.`,
      };
    }

    await db.$transaction(async (ctx) => {
      await ctx.subscriptionPlan.create({
        data: {
          name: parsedData.name,
          code: subscriptionCode,
          amount: parsedData.amount,
          interval: parsedData.interval,
          description: parsedData.description || null,
          isActive: parsedData.status === "ACTIVE",
        },
      });
    });

    revalidatePath("/fees");

    await createAuditLog({
      action: "CREATE_SUBSCRIPTION_FEE",
      resource: "SubscriptionPlan",
      details: `Created new fee plan: ${parsedData.name} - ${parsedData.amount} (${parsedData.interval})`,
      userId: session.user.id,
    });

    return {
      success: true,
      message: "Subscription fee created successfully",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("CreateSubscriptionFees error:", error);

    if (error.code === "P2002") {
      return {
        success: false,
        message:
          "A subscription plan with this code already exists. Please use a different name.",
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
