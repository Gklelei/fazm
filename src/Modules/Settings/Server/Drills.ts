"use server";

import { auth } from "@/lib/auth";
import { DrillsSchema, DrillsSchemaType } from "../Validation";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { toUpperUnderscore } from "@/utils/TansformWords";

export const CreateDrills = async (
  data: DrillsSchemaType,
): Promise<ActionResult> => {
  const values = DrillsSchema.parse(data);
  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized: Please log in.",
    };
  }

  if (!allowedRoles.includes(session.user.role || "")) {
    return {
      success: false,
      message: "Unauthorized: You are not allowed to perfome this action.",
    };
  }
  try {
    const upperValue = toUpperUnderscore(values.name);
    await db.drills.create({
      data: {
        name: values.name,
        description: values.description,
        value: upperValue,
      },
    });
    return {
      success: true,
      message: "Drill Created  successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
export const EditDrills = async (
  data: DrillsSchemaType,
  drillId: string,
): Promise<ActionResult> => {
  const values = DrillsSchema.parse(data);
  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized: Please log in.",
    };
  }

  if (!allowedRoles.includes(session.user.role || "")) {
    return {
      success: false,
      message: "Unauthorized: You are not allowed to perfome this action.",
    };
  }
  try {
    const existingDrill = await db.drills.findUnique({
      where: {
        id: drillId,
      },
    });

    if (!existingDrill) {
      return {
        success: false,
        message: "Drill not found",
      };
    }
    const upperValue = toUpperUnderscore(values.name);
    await db.drills.update({
      where: { id: drillId },
      data: {
        name: values.name,
        description: values.description,
        value: upperValue,
      },
    });
    return {
      success: true,
      message: "Drill Updated successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};

export const DeleteDrills = async ({
  drillId,
}: {
  drillId: string;
}): Promise<ActionResult> => {
  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized: Please log in.",
    };
  }

  if (!allowedRoles.includes(session.user.role || "")) {
    return {
      success: false,
      message: "Unauthorized: You are not allowed to perfome this action.",
    };
  }

  try {
    const existingDrill = await db.drills.findUnique({
      where: {
        id: drillId,
      },
    });

    if (!existingDrill) {
      return {
        success: false,
        message: "Drill not found",
      };
    }

    await db.drills.update({
      where: {
        id: drillId,
      },
      data: {
        voided: 1,
      },
    });

    return {
      message: "Drill updated",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
