import { z } from "zod";

const requiredString = z.string().trim().min(1, "This field is required");

export const AddressInfoSchema = z.object({
  country: requiredString,
  county: requiredString,
  subCounty: requiredString,
  addressLine1: requiredString,
  addressLine2: z.string().optional(),
});

export type AddressInfoSchemaType = z.infer<typeof AddressInfoSchema>;
