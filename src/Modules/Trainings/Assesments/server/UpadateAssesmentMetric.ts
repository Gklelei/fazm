"use server";

import { auth } from "@/lib/auth";
import { MetricsSchema, MetricsSchemaType } from "../Validators";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const UpdateAssesmentMetric = async (
  id: string,
  data: MetricsSchemaType,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { message: "Unauthorized access", success: false };
  }

  const { description, metrics, name } = MetricsSchema.parse(data);

  try {
    await db.$transaction(async (ctx) => {
      const existingSection = await ctx.assessmentTemplateSection.findUnique({
        where: { id },
      });

      if (!existingSection) {
        throw new Error("Assessment section not found");
      }

      await ctx.assessmentTemplateSection.update({
        where: { id },
        data: { description, name },
      });

      const dbMetrics = await ctx.assessmentMetric.findMany({
        where: { sectionId: id, isArchived: false },
        select: { id: true },
      });

      const dbIds = dbMetrics.map((i) => i.id);
      const incomingIds = metrics.map((i) => i.id).filter(Boolean) as string[];

      const idsToArchive = dbIds.filter((dbId) => !incomingIds.includes(dbId));

      if (idsToArchive.length > 0) {
        await ctx.assessmentMetric.updateMany({
          where: { id: { in: idsToArchive } },
          data: { isArchived: true },
        });
      }

      for (const m of metrics) {
        if (m.id) {
          await ctx.assessmentMetric.update({
            where: { id: m.id },
            data: {
              label: m.label,
            },
          });
        } else {
          await ctx.assessmentMetric.create({
            data: {
              label: m.label,
              sectionId: id,
              isArchived: false,
            },
          });
        }
      }
    });
    revalidatePath("/assessments");

    return {
      message: "Assessment template updated successfully",
      success: true,
    };
  } catch (error) {
    console.error("Update Error:", error);
    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
};
