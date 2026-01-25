import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");

const INTERVALS = ["YEARLY", "MONTHLY", "WEEKLY", "DAILY", "ONCE"] as const;
const STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const SubscriptionsSchema = z.object({
  name: requiredString,

  amount: z.coerce
    .number({
      error: "Amount should be a valid number",
    })
    .min(1, "Amount cannot be less than 1"),

  interval: z.enum(INTERVALS).refine((val) => INTERVALS.includes(val), {
    error: "Select a valid interval",
  }),

  description: requiredString,

  status: z.enum(STATUSES).refine((val) => STATUSES.includes(val), {
    error: "Select a valid status",
  }),
});

export type SubscriptionsSchemaType = z.input<typeof SubscriptionsSchema>;
