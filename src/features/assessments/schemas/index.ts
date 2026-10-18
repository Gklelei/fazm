import { z } from "zod";

/** Shared by the assessment forms (browser) and the actions (server). */

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);

export const sectionSchema = z.object({
  name: text(60).min(1, "Name the section"),
  description: text(200),
  metrics: z
    .array(
      z
        .object({
          /** Set for skills already saved */
          id: z.string().optional(),
          label: text(80).min(1, "Name the skill"),
          kind: z.enum(["GRADE", "MEASURE"]),
          unit: text(12),
          higherIsBetter: z.boolean(),
        })
        .superRefine((m, ctx) => {
          if (m.kind === "MEASURE" && !m.unit) ctx.addIssue({ code: "custom", path: ["unit"], message: "Add a unit, e.g. s or touches" });
        }),
    )
    .min(1, "Add at least one skill")
    .max(30, "Up to 30 skills"),
});

export type SectionInput = z.input<typeof sectionSchema>;

const measure = z
  .string()
  .trim()
  .refine((v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 100_000), "Enter a number");

export const assessmentSchema = z.object({
  trainingId: z.string().min(1),
  athleteId: z.string().min(1),
  /** metricId → grade, for graded skills */
  grades: z.record(z.string(), z.enum(["BELOW_STANDARD", "NEEDS_WORK", "GOOD", "VERY_GOOD", "EXCELLENT"])),
  /** metricId → measured value, for measured skills; empty = not measured */
  values: z.record(z.string(), measure),
  /** sectionId → note */
  notes: z.record(z.string(), text(500)),
  comment: text(1000),
});

export type AssessmentInput = z.input<typeof assessmentSchema>;
