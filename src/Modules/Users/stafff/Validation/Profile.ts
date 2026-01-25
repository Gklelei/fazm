import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");
const optionalString = z.string().trim().optional();

export const AccountSettingSchema = z.object({
  fullNames: requiredString,
  profilePicture: optionalString,
  role: requiredString,
  email: requiredString,
  phoneNumber: requiredString,
});

export type AccountSettingSchemaType = z.infer<typeof AccountSettingSchema>;
