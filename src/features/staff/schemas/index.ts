import z from "zod";
import { passwordProblem, PASSWORD_RULE_TEXT } from "@/lib/password-policy";

const requiredString = z.string().trim().nonempty("This field is required");

export const CreateStaffSchema = z.object({
  fullName: requiredString,
  role: z.enum(["ADMIN", "COACH", "DOCTOR", "FINANCE", "SUPER_ADMIN"], {
    error: "Select atleast one role",
  }),
  email: z.string().email({ message: "Enter a valid email" }),
  image: z.string().optional(),
  password: z.string().refine((p) => !passwordProblem(p), PASSWORD_RULE_TEXT),
  phoneNumber: z.string().trim().min(10, "Enter a valid phone number"),
});

export const EditStaffSchema = CreateStaffSchema.omit({
  password: true,
});

export type CreateStaffSchemaType = z.infer<typeof CreateStaffSchema>;
export type EditStaffSchemaType = z.infer<typeof EditStaffSchema>;
