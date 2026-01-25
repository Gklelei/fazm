import z from "zod";

export const AuthSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address"
    ),
  password: z.string().trim().min(8, "Password should be atleast 8 characters"),
});

export type signInSchemaType = Pick<SignUpSchemaType, "email" | "password">;

export const signInSchema = AuthSchema.pick({
  email: true,
  password: true,
});

export type SignUpSchemaType = z.infer<typeof AuthSchema>;

export const SignUpSchema = AuthSchema;
