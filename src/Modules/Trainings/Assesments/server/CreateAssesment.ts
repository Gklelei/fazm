"use server";

import { GradeRating } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";

type SaveAssessmentInput = {
  athleteId: string;
  trainingId: string;
  coachId: string;
  scores: Record<string, string>;
  comment: string | null;
};

const gradeMap: Record<string, GradeRating> = {
  "1": GradeRating.BELOW_STANDARD,
  "2": GradeRating.NEEDS_WORK,
  "3": GradeRating.GOOD,
  "4": GradeRating.VERY_GOOD,
  "5": GradeRating.EXCELLENT,
};

export async function saveAssessment(input: SaveAssessmentInput) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { status: "ERROR", errorMessage: "Unauthorized" };

  const { athleteId, trainingId, coachId, scores, comment } = input;

  try {
    const assessmentResult = await db.$transaction(async (tx) => {
      // 1) Upsert assessment (edit-friendly)
      const assessment = await tx.assessment.upsert({
        where: { athleteId_trainingId: { athleteId, trainingId } },
        create: { athleteId, trainingId, coachId, comment },
        update: { coachId, comment },
        select: { id: true },
      });

      // 2) Upsert each response (one per metric)
      const metricIds = Object.keys(scores);

      for (const metricId of metricIds) {
        const grade = gradeMap[scores[metricId]];
        if (!grade) continue;

        await tx.assessmentResponse.upsert({
          where: {
            assessmentId_metricId: { assessmentId: assessment.id, metricId },
          },
          create: {
            assessmentId: assessment.id,
            metricId,
            grade,
          },
          update: {
            grade,
          },
        });
      }

      return assessment;
    });

    revalidatePath("/trainings/assessments");
    revalidatePath(`/assesments/${trainingId}/mark`);

    await createAuditLog({
      action: "CREATE_ASSESSMENT",
      resource: "Assessment",
      details: `Created/updated assessment for athlete ${athleteId} in training session ${trainingId}`,
      userId: session.user.id,
      assessmentId: assessmentResult.id,
      athleteId,
      trainingId,
    });

    return {
      status: "SUCCESS",
      successMessage: "Assessment saved successfully",
    };
  } catch (error) {
    console.error("Failed to save assessment:", error);
    return { status: "ERROR", errorMessage: "Internal Database Error" };
  }
}
