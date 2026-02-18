import { z } from "zod";

const DayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const isValidTime = (t: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);

const minutesFromHHmm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const BatchesSchemaTest = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional(),
    startDate: z.coerce.date({ message: "Enter a valid start date" }),
    endDate: z.coerce
      .date({ message: "Enter a valid end date" })
      .refine((val) => val >= startOfToday(), {
        message: "End Date cannot be in the past",
      }),

    trainingLocationsId: z
      .string()
      .trim()
      .min(1, "Training location is required"),
    staffId: z.string().trim().min(1, "Coach is required"),
    sessions: z
      .array(
        z
          .object({
            days: z.array(DayOfWeekEnum).min(1, "Select at least one day"),
            startTime: z
              .string()
              .trim()
              .refine(isValidTime, { message: "Start time is invalid" }),
            endTime: z
              .string()
              .trim()
              .refine(isValidTime, { message: "End time is invalid" }),
          })
          .refine(
            (v) => minutesFromHHmm(v.endTime) > minutesFromHHmm(v.startTime),
            {
              message: "End time must be after start time",
              path: ["endTime"],
            },
          ),
      )
      .min(1, "At least one session is required"),
  })
  .refine((val) => val.endDate > val.startDate, {
    message: "End date should be after the start date",
    path: ["endDate"],
  });

export const TrainingLocationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const DrillsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});

export const BatchesSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});

export type BatchesSchemaType = z.infer<typeof BatchesSchema>;
export type TrainingLocationSchemaType = z.infer<typeof TrainingLocationSchema>;
export type DrillsSchemaType = z.infer<typeof DrillsSchema>;
