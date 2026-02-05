"use server";

import { db } from "@/lib/prisma";
import { BatchesSchema, BatchesSchemaType } from "../Validation";
import { revalidatePath } from "next/cache";

export async function CreateBatches(
  data: BatchesSchemaType,
): Promise<ActionResult> {
  const values = BatchesSchema.parse(data);

  try {
    await db.batches.create({
      data: {
        name: values.name,
        description: values.description,
      },
    });
    revalidatePath("/settings/utils");
    return {
      success: true,
      message: "Batch Created succecifully",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
}
