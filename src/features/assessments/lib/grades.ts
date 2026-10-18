import type { GradeRating } from "@/generated/prisma/enums";

/** The 5-level scale, worst to best; index + 1 is the score used for averages and trends. */
export const GRADES = [
  { value: "BELOW_STANDARD", short: "1", label: "Below standard" },
  { value: "NEEDS_WORK", short: "2", label: "Needs work" },
  { value: "GOOD", short: "3", label: "Good" },
  { value: "VERY_GOOD", short: "4", label: "Very good" },
  { value: "EXCELLENT", short: "5", label: "Excellent" },
] as const satisfies readonly { value: GradeRating; short: string; label: string }[];

export const gradeScore = (g: GradeRating | string | null | undefined) => {
  const i = GRADES.findIndex((x) => x.value === g);
  return i < 0 ? null : i + 1;
};

/** The grade nearest an average score, e.g. 3.6 → "Very good". */
export const gradeLabel = (score: number) => GRADES[Math.min(4, Math.max(0, Math.round(score) - 1))].label;

/** How a score reads: a grade's label, or a measurement with its unit. */
export const scoreText = (m: { kind: string; unit?: string | null }, score: number) =>
  m.kind === "GRADE" ? gradeLabel(score) : `${Number.isInteger(score) ? score : score.toFixed(2)}${m.unit ? ` ${m.unit}` : ""}`;

/** An average reads as a number: "4.5 of 5" for grades, "4.75 s" for measurements. */
export const averageText = (m: { kind: string; unit?: string | null }, avg: number) =>
  m.kind === "GRADE" ? `${avg.toFixed(1)} of 5` : scoreText(m, avg);
