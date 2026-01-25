"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export const DeleteAssessmentSection = async (
  id: string,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { message: "Unauthorized access", success: false };
  }

  try {
    await db.$transaction(async (ctx) => {
      const section = await ctx.assessmentTemplateSection.findUnique({
        where: { id },
        select: { isArchived: true },
      });

      if (!section) {
        throw new Error("Assessment section does not exist");
      }

      if (section.isArchived) {
        throw new Error("Section is already archived");
      }

      await ctx.assessmentTemplateSection.update({
        where: { id },
        data: { isArchived: true },
      });
    });

    revalidatePath("/assesments");

    return {
      message: "Assessment template deleted successfully",
      success: true,
    };
  } catch (error) {
    console.error("Archive Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
