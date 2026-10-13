import z from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address",
    ),
  password: z.string().min(8, "Password should be at least 8 characters"),
});

export type signInSchemaType = z.infer<typeof signInSchema>;
