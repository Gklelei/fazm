import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");
export const MetricsSchema = z.object({
  name: requiredString,
  description: requiredString,
  metrics: z
    .array(
      z.object({
        label: z.string().min(1, "Metric label is required"),
        id: z.string().optional(),
      }),
    )
    .min(1, "At least one metric is required per section"),
});

export type MetricsSchemaType = z.infer<typeof MetricsSchema>;
