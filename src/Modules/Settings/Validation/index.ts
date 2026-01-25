import z from "zod";

export const BatchesSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});

export const TrainingLocationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const DrillsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().optional(),
});

export type BatchesSchemaType = z.infer<typeof BatchesSchema>;
export type TrainingLocationSchemaType = z.infer<typeof TrainingLocationSchema>;
export type DrillsSchemaType = z.infer<typeof DrillsSchema>;
