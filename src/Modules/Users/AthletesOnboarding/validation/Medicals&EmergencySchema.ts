import { z } from "zod";

const requiredString = z.string().trim().min(1, "This field is required");

export const MedicalsEmergencySchema = z.object({
  bloodGroup: z
    .string()
    .refine(
      (val) => ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(val),
      { message: "Please select a valid blood group" }
    ),
  allergies: requiredString,
  medicalConditions: requiredString,
  emergencyContactName: requiredString.max(100),
  emergencyContactPhone: z.string().min(10, "Phone must be at least 10 digits"),
  emergencyContactRelationship: requiredString,
});

export type MedicalsEmergencySchemaType = z.infer<
  typeof MedicalsEmergencySchema
>;
