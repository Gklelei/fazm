import z from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "That doesn't look like an email address.");

// Sign-in only checks that something was typed: the length rules apply when
// a password is set, and the server is the judge of whether it's right.
export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type signInSchemaType = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email });
export type forgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
