"use server";

import { GradeRating } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type SaveAssessmentInput = {
  athleteId: string;
  trainingId: string;
  coachId: string;
  scores: Record<string, string>;
  metricComments: Record<string, string>; // Changed from sectionComments
};

const gradeMap: Record<string, GradeRating> = {
  "1": GradeRating.BELOW_STANDARD,
  "2": GradeRating.NEEDS_WORK,
  "3": GradeRating.GOOD,
  "4": GradeRating.VERY_GOOD,
  "5": GradeRating.EXCELLENT,
};

export async function saveAssessment(input: SaveAssessmentInput) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { status: "ERROR", errorMessage: "Unauthorized" };
  }

  const { athleteId, trainingId, coachId, scores, metricComments } = input;

  try {
    await db.$transaction(async (tx) => {
      const assessment = await tx.assessment.create({
        data: {
          athleteId,
          trainingId,
          coachId,
        },
      });
      const responseData = Object.keys(scores).map((metricId) => {
        return {
          assessmentId: assessment.id,
          metricId: metricId,
          grade: gradeMap[scores[metricId]],
          comment: metricComments[metricId] || null,
        };
      });
      await tx.assessmentResponse.createMany({
        data: responseData,
      });
    });

    revalidatePath("/trainings/assessments");
    revalidatePath(`/assesments/${trainingId}/mark`);
    return {
      status: "SUCCESS",
      successMessage: "Assessment saved successfully",
    };
  } catch (error) {
    console.error("Failed to save assessment:", error);
    return { status: "ERROR", errorMessage: "Internal Database Error" };
  }
}
