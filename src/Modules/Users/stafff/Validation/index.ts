import { ROLES } from "@/generated/prisma/enums";
import z from "zod";

const requiredString = z.string().trim().nonempty("This field is required");

export const CreateStaffSchema = z.object({
  fullName: requiredString,
  role: z.enum(ROLES),
  email: z.string().email({ message: "Enter a valid email" }),
  image: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().trim().min(12, "Enter a valid phone number"),
});

export type CreateStaffSchemaType = z.infer<typeof CreateStaffSchema>;
