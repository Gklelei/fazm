"use server";

import { auth } from "@/lib/auth";

import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { toUpperUnderscore } from "@/utils/TansformWords";
import {
  TrainingLocationSchema,
  TrainingLocationSchemaType,
} from "../Validation";

export async function CreateTrainingLocations(
  data: TrainingLocationSchemaType
): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized: Please log in.",
    };
  }
  const values = TrainingLocationSchema.parse(data);

  try {
    const upperValue = toUpperUnderscore(values.name);
    await db.trainingLocations.create({
      data: {
        name: values.name,
        value: upperValue,
      },
    });

    return {
      success: true,
      message: "Training location Created scheduled successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}
