"use server";

import { db } from "@/lib/prisma";
import { MetricsSchema, MetricsSchemaType } from "../Validators";
import { revalidatePath } from "next/cache";

export const CreateAssesmentMetricAction = async (
  data: MetricsSchemaType,
): Promise<ActionResult> => {
  const parsedData = MetricsSchema.parse(data);

  try {
    await db.$transaction(async (ctx) => {
      const lastSection = await ctx.assessmentTemplateSection.aggregate({
        _max: {
          order: true,
        },
      });
      const nextOrder = (lastSection._max.order ?? -1) + 1;
      await ctx.assessmentTemplateSection.create({
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
    return {
      success: true,
      message: "Metric section created successfully",
    };
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
