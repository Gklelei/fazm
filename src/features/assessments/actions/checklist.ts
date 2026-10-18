"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { sectionSchema, type SectionInput } from "@/features/assessments/schemas";

const touched = () => {
  revalidatePath("/assesments");
};

/**
 * Adds a section, or saves an existing one with its skills in the order
 * given. Skills taken out are archived, so past grades keep their name.
 */
export async function saveSection(id: string | null, input: SectionInput) {
  return asRole("admin", async (user) => {
    const v = sectionSchema.parse(input);
    const saved = await db.$transaction(async (tx) => {
      const section = id
        ? await tx.assessmentTemplateSection.update({ where: { id }, data: { name: v.name, description: v.description || null } }).catch(() => null)
        : await tx.assessmentTemplateSection.create({
            data: {
              name: v.name,
              description: v.description || null,
              order: ((await tx.assessmentTemplateSection.aggregate({ _max: { order: true } }))._max.order ?? -1) + 1,
            },
          });
      if (!section) throw new ActionError("That section no longer exists.");

      const keep = v.metrics.map((m) => m.id).filter(Boolean) as string[];
      const owned = await tx.assessmentMetric.count({ where: { id: { in: keep }, sectionId: section.id } });
      if (owned !== keep.length) throw new ActionError("Those skills changed meanwhile. Reload the page.");
      const archived = await tx.assessmentMetric.updateMany({
        where: { sectionId: section.id, isArchived: false, id: { notIn: keep } },
        data: { isArchived: true },
      });
      for (const [position, m] of v.metrics.entries()) {
        const data = { label: m.label, kind: m.kind, unit: m.kind === "MEASURE" ? m.unit : null, higherIsBetter: m.higherIsBetter, position };
        if (m.id) await tx.assessmentMetric.update({ where: { id: m.id }, data });
        else await tx.assessmentMetric.create({ data: { ...data, sectionId: section.id } });
      }
      return { section, archived: archived.count };
    });

    touched();
    await createAuditLog({
      action: id ? "UPDATE_ASSESSMENT_SECTION" : "CREATE_ASSESSMENT_SECTION",
      resource: "AssessmentSection",
      details: `${id ? "Updated" : "Added"} assessment section "${v.name}": ${v.metrics.map((m) => m.label).join(", ")}${
        saved.archived ? `; ${saved.archived} skill${saved.archived === 1 ? "" : "s"} taken out` : ""
      }`,
      userId: user.id,
      recordId: saved.section.id,
    });
    return { success: true as const, message: id ? "Section saved." : `${v.name} added.` };
  });
}

/** Take a section out of the checklist (or put it back). Past assessments keep it. */
export async function setSectionArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const s = await db.assessmentTemplateSection.update({ where: { id }, data: { isArchived: archived } }).catch(() => null);
    if (!s) throw new ActionError("That section no longer exists.");
    touched();
    await createAuditLog({
      action: archived ? "ARCHIVE_ASSESSMENT_SECTION" : "RESTORE_ASSESSMENT_SECTION",
      resource: "AssessmentSection",
      details: `${archived ? "Took out" : "Restored"} assessment section "${s.name}"`,
      userId: user.id,
      recordId: id,
    });
    return { success: true as const, message: archived ? `${s.name} taken out.` : `${s.name} restored.` };
  });
}

/** Move a section up or down the checklist. */
export async function moveSection(id: string, direction: -1 | 1) {
  return asRole("admin", async (user) => {
    const name = await db.$transaction(async (tx) => {
      const all = await tx.assessmentTemplateSection.findMany({ where: { isArchived: false }, orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true, name: true } });
      const i = all.findIndex((s) => s.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= all.length) return null;
      [all[i], all[j]] = [all[j], all[i]];
      for (const [order, s] of all.entries()) await tx.assessmentTemplateSection.update({ where: { id: s.id }, data: { order } });
      return all[j].name;
    });
    if (!name) return { success: true as const, message: "" };
    touched();
    await createAuditLog({ action: "UPDATE_ASSESSMENT_SECTION", resource: "AssessmentSection", details: `Moved "${name}" ${direction < 0 ? "up" : "down"}`, userId: user.id, recordId: id });
    return { success: true as const, message: "" };
  });
}
