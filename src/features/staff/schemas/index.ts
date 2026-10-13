import z from "zod";

const requiredString = z.string().trim().nonempty("This field is required");

export const CreateStaffSchema = z.object({
  fullName: requiredString,
  role: z.enum(["ADMIN", "COACH", "DOCTOR", "FINANCE", "SUPER_ADMIN"], {
    error: "Select atleast one role",
  }),
  email: z.string().email({ message: "Enter a valid email" }),
  image: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().trim().min(10, "Enter a valid phone number"),
});

export const EditStaffSchema = CreateStaffSchema.omit({
  password: true,
});

export type CreateStaffSchemaType = z.infer<typeof CreateStaffSchema>;
export type EditStaffSchemaType = z.infer<typeof EditStaffSchema>;
