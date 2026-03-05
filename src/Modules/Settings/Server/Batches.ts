"use server";

import { db } from "@/lib/prisma";
import { BatchesSchema, BatchesSchemaType } from "../Validation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";


export async function CreateBatches(
  data: BatchesSchemaType,
): Promise<ActionResult> {
  const values = BatchesSchema.parse(data);
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { success: false, message: "Unauthorized access" };
  }

  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];
  if (!allowedRoles.includes(session.user.role || "")) {
    return { success: false, message: "Unauthorized: You are not allowed to perform this action." };
  }

  try {
    const batch = await db.batches.create({
      data: {
        name: values.name,
        description: values.description,
      },
    });

    await createAuditLog({
      action: "CREATE_BATCH",
      resource: "Batches",
      details: `Created training batch "${values.name}"`,
      userId: session.user.id,
      batchId: batch.id,
    });



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
