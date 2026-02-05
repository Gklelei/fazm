"use server";

import { auth } from "@/lib/auth";
import { DrillsSchema, DrillsSchemaType } from "../Validation";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { toUpperUnderscore } from "@/utils/TansformWords";
import { revalidatePath } from "next/cache";

export const CreateDrills = async (
  data: DrillsSchemaType,
): Promise<ActionResult> => {
  const values = DrillsSchema.parse(data);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized: Please log in.",
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
    revalidatePath("/settings/utils");
    return {
      success: true,
      message: "Drill Created scheduled successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
