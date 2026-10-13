import { z } from "zod";

const requiredString = z.string().trim().min(1, "This field is required");

export const AthleteGuardianSchema = z.object({
  guardianFullNames: requiredString,
  guardianRelationShip: requiredString,
  guardianEmail: requiredString,
  guardianPhoneNumber: requiredString,
});

export type AthleteGuardianSchemaType = z.infer<typeof AthleteGuardianSchema>;
