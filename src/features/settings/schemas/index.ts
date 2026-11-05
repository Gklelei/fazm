import { z } from "zod";
import { DAYS, MAX_PLAN_DAYS } from "@/features/settings/lib/plan-sessions";
import { minutesBetween } from "@/lib/academy-time";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const batchSchema = z.object({
  name: z.string().trim().min(1, "Give the batch a name").max(60, "Keep it under 60 characters"),
  description: z.string().trim().max(200, "Keep it under 200 characters").optional(),
  /** Empty while programmes are hidden: a new batch goes in the first programme, an edited one stays put */
  programmeId: z.string().optional(),
});
export type BatchInput = z.infer<typeof batchSchema>;

export const slotSchema = z
  .object({
    days: z.array(z.enum(DAYS)).min(1, "Pick at least one day"),
    time,
    endTime: time,
    trainingLocationsId: z.string().min(1, "Pick a pitch"),
    staffId: z.string().min(1, "Pick a coach"),
  })
  .refine((s) => minutesBetween(s.time, s.endTime) > 0, { message: "Ends before it starts", path: ["endTime"] });

export const timetableSchema = z
  .object({ slots: z.array(slotSchema).max(14, "Up to 14 slots") })
  .superRefine(({ slots }, ctx) => {
    // A batch can't be in two sessions at once
    slots.forEach((a, i) =>
      slots.slice(0, i).forEach((b) => {
        const sameDay = a.days.some((d) => b.days.includes(d));
        if (sameDay && a.time < b.endTime && b.time < a.endTime) {
          ctx.addIssue({ code: "custom", path: ["slots", i, "time"], message: "Overlaps another slot on the same day" });
        }
      }),
    );
  });
export type TimetableInput = z.infer<typeof timetableSchema>;

export const planSchema = z
  .object({ from: ymd, to: ymd })
  .refine((p) => p.to >= p.from, { message: "Ends before it starts", path: ["to"] })
  .refine((p) => (Date.parse(p.to) - Date.parse(p.from)) / 86_400_000 < MAX_PLAN_DAYS, {
    message: "Plan at most 26 weeks at a time",
    path: ["to"],
  });
export type PlanInput = z.infer<typeof planSchema>;

const name = z.string().trim().min(1, "Enter a name").max(80, "Keep it under 80 characters");

export const pitchSchema = z.object({ name });
export const programmeSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40, "Keep it under 40 characters"),
});
export const drillSchema = z.object({
  name,
  description: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});
export const reasonSchema = z.object({
  status: z.enum(["ABSENT", "LATE", "EXCUSED", "PRESENT"]),
  label: name,
});
