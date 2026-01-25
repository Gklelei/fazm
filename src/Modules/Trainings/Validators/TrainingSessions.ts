import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");

export const TrainingSessionSchema = z
  .object({
    title: requiredString,
    description: requiredString,
    date: z.string().refine(
      (val) => {
        const selected = new Date(val);
        return selected.getTime() >= Date.now();
      },
      {
        message: "You cannot select a past date or time",
      }
    ),
    duration: z.coerce
      .number()
      .int()
      .positive("Duration must be greater than zero"),

    location: requiredString,

    drills: z.array(z.string()).min(1, "At least one drill must be selected"),

    coach: requiredString,

    batch: requiredString,

    players: z.array(z.string()).min(1, "At least one player must be selected"),

    maxPlayers: z.coerce
      .number()
      .int()
      .min(1, "Max players should be at least one"),

    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.players.length > data.maxPlayers) {
      ctx.addIssue({
        path: ["players"],
        message: "Selected players exceed maximum allowed players",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type TrainingSessionSchemaType = z.infer<typeof TrainingSessionSchema>;
export const ClientTrainingSessionSchema = TrainingSessionSchema.omit({
  players: true,
  maxPlayers: true,
});
