"use server";

import { ROLE_GROUPS } from "@/lib/roles";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";

export const DeleteAssessmentSection = async (
  id: string,
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

  try {
    const name = await db.$transaction(async (ctx) => {
      const section = await ctx.assessmentTemplateSection.findUnique({
        where: { id },
        select: { isArchived: true, name: true },
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
      return section.name;
    });

    revalidatePath("/assesments");
    await createAuditLog({
      action: "ARCHIVE_ASSESSMENT_SECTION",
      resource: "AssessmentSection",
      details: `Archived assessment section "${name}"`,
      userId: session.user.id,
      recordId: id,
    });

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
