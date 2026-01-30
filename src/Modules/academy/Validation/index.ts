import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");

export const AcademySchema = z.object({
  paymentMethod: requiredString,
  paymentType: requiredString,
  academyName: requiredString,
  tagline: requiredString,
  description: z.string().optional(),
  email: requiredString,
  phone: requiredString,
  address: requiredString,
  logo: z.file({ error: "Please select a valid image" }),
});
