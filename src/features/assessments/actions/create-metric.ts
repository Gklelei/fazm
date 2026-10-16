"use server";

import { ROLE_GROUPS } from "@/lib/roles";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import {
  MetricsSchema,
  MetricsSchemaType,
} from "@/features/assessments/schemas";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";

export const CreateAssesmentMetricAction = async (
  data: MetricsSchemaType,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { message: "Unauthorized access", success: false };
  }

  const allowedRoles = [...ROLE_GROUPS.admin] as string[];
  if (!allowedRoles.includes(session.user.role ?? "")) {
    return {
      message: "Unauthorized: You are not allowed to perform this action.",
      success: false,
    };
  }

  const input1 = MetricsSchema.safeParse(data);
  if (!input1.success) return { success: false, message: actionErrorMessage(input1.error) };
  const parsedData = input1.data;

  try {
    const section = await db.$transaction(async (ctx) => {
      const lastSection = await ctx.assessmentTemplateSection.aggregate({
        _max: {
          order: true,
        },
      });
      const nextOrder = (lastSection._max.order ?? -1) + 1;
      return ctx.assessmentTemplateSection.create({
        data: {
          name: parsedData.name,
          description: parsedData.description,
          order: nextOrder,
          metrics: {
            create: parsedData.metrics.map((i) => ({
              label: i.label,
            })),
          },
        },
      });
    });
    revalidatePath("/assesments");
    await createAuditLog({
      action: "CREATE_ASSESSMENT_SECTION",
      resource: "AssessmentSection",
      details: `Added assessment section "${parsedData.name}" with ${parsedData.metrics.length} metric${parsedData.metrics.length === 1 ? "" : "s"}`,
      userId: session.user.id,
      recordId: section.id,
    });
    return {
      success: true,
      message: "Metric section created successfully",
    };
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return {
        success: false,
        message: actionErrorMessage(error),
      };
    }
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
