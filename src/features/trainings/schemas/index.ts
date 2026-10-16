import { z } from "zod";
import { minutesBetween } from "@/lib/academy-time";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);

/** Planning or editing one session. Date and times are academy (Nairobi) time. */
export const sessionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    start: time,
    end: time,
    batch: z.string().min(1, "Choose a batch"),
    location: z.string().min(1, "Choose a pitch"),
    coach: z.string().min(1, "Choose a coach"),
    title: text(100).min(1, "Enter a title"),
    description: text(500),
    drills: z.array(z.string()).max(30, "Up to 30 drills"),
    note: text(500),
  })
  .refine((v) => minutesBetween(v.start, v.end) > 0, { message: "Ends before it starts", path: ["end"] });

export type SessionInput = z.input<typeof sessionSchema>;
