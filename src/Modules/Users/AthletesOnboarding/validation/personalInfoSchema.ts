import { z } from "zod";

const requiredString = z.string().trim().min(1, "This field is required");
const optionalString = z.string().trim().optional().or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address")
  .or(z.literal(""));

const optionalPhone = z
  .string()
  .trim()
  .min(12, "Enter a valid phone number")
  .or(z.literal(""));

export const personalInfoSchema = z.object({
  firstName: requiredString,
  lastName: requiredString,
  middleName: optionalString,

  // Change to this:
  email: optionalEmail,
  phoneNumber: optionalPhone,

  dateOfBirth: requiredString.refine(
    (val) => {
      const dob = new Date(val).getFullYear();
      const now = new Date().getFullYear();
      return now - dob >= 3;
    },
    { message: "Athlete must be at least 3 years old" }
  ),
  batch: requiredString,
  profilePIcture: optionalString,
});
