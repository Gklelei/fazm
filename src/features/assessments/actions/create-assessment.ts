"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { mayManageSession, NOT_YOUR_SESSION } from "@/features/trainings/lib/ownership";
import { assessmentSchema, type AssessmentInput } from "@/features/assessments/schemas";
import { athletePath } from "@/features/athletes/lib/athlete-links";

/**
 * Saves (or updates) one athlete's assessment for a session: grades,
 * measurements, section notes and a comment. Skills left empty are cleared.
 * The assessing coach is the session's coach.
 */
export async function saveAssessment(input: AssessmentInput) {
  return asRole("coaching", async (user) => {
    const v = assessmentSchema.parse(input);
    const training = await db.training.findUnique({
      where: { id: v.trainingId },
      select: { staffId: true, isArchived: true, athletes: { where: { athleteId: v.athleteId }, select: { athleteId: true, firstName: true, lastName: true } } },
    });
    if (!training || training.isArchived) throw new ActionError("This session no longer exists.");
    if (!(await mayManageSession(user, training.staffId))) throw new ActionError(NOT_YOUR_SESSION);
    const athlete = training.athletes[0];
    if (!athlete) throw new ActionError("This athlete isn't on this session's register.");

    const metrics = await db.assessmentMetric.findMany({
      where: { isArchived: false, section: { isArchived: false } },
      select: { id: true, kind: true, sectionId: true },
    });
    const byId = new Map(metrics.map((m) => [m.id, m]));
    const sections = new Set(metrics.map((m) => m.sectionId));
    const responses = [
      ...Object.entries(v.grades).map(([metricId, grade]) => ({ metricId, grade, value: null })),
      ...Object.entries(v.values)
        .filter(([, value]) => value !== "")
        .map(([metricId, value]) => ({ metricId, grade: null, value: new Prisma.Decimal(value) })),
    ];
    for (const r of responses) {
      const kind = byId.get(r.metricId)?.kind;
      if (!kind || (kind === "GRADE") !== !!r.grade) throw new ActionError("The checklist changed meanwhile. Reload the page.");
    }
    const notes = Object.entries(v.notes).filter(([sectionId, note]) => note && sections.has(sectionId));
    if (!responses.length && !notes.length && !v.comment) throw new ActionError("Grade at least one skill, or add a comment.");

    const assessment = await db.$transaction(async (tx) => {
      const a = await tx.assessment.upsert({
        where: { athleteId_trainingId: { athleteId: v.athleteId, trainingId: v.trainingId } },
        create: { athleteId: v.athleteId, trainingId: v.trainingId, coachId: training.staffId, comment: v.comment || null },
        update: { coachId: training.staffId, comment: v.comment || null },
        select: { id: true },
      });
      // What was saved is replaced by what's on the form now
      await tx.assessmentResponse.deleteMany({ where: { assessmentId: a.id } });
      await tx.assessmentSectionNote.deleteMany({ where: { assessmentId: a.id } });
      if (responses.length) await tx.assessmentResponse.createMany({ data: responses.map((r) => ({ ...r, assessmentId: a.id })) });
      if (notes.length) await tx.assessmentSectionNote.createMany({ data: notes.map(([sectionId, note]) => ({ assessmentId: a.id, sectionId, note })) });
      return a;
    });

    revalidatePath(`/assesments/${v.trainingId}/mark`);
    revalidatePath(`/sessions/view/${v.trainingId}`);
    revalidatePath(athletePath(v.athleteId));
    await createAuditLog({
      action: "CREATE_ASSESSMENT",
      resource: "Assessment",
      details: `Assessed ${athlete.firstName} ${athlete.lastName} (${v.athleteId}): ${responses.length} skill${responses.length === 1 ? "" : "s"}`,
      userId: user.id,
      assessmentId: assessment.id,
      athleteId: v.athleteId,
      trainingId: v.trainingId,
    });
    return { success: true as const, message: `${athlete.firstName}'s assessment saved.` };
  });
}
