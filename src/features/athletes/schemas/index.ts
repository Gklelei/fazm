import z from "zod";
import { AddressInfoSchema } from "@/features/athletes/schemas/address";
import { AthleteGuardianSchema } from "@/features/athletes/schemas/guardian";
import { MedicalsEmergencySchema } from "@/features/athletes/schemas/medical";
import { personalInfoSchema } from "@/features/athletes/schemas/personal-info";
import {
  AthleteDoccumentsSchema,
  AthletePyschicalsSchema,
} from "@/features/athletes/schemas/documents";
import { SubscriptionSchema } from "@/features/athletes/schemas/subscription";

export const AthleteOnBoardingSchema = personalInfoSchema
  .merge(MedicalsEmergencySchema)
  .merge(AddressInfoSchema)
  .merge(AthleteGuardianSchema)
  .merge(AthleteDoccumentsSchema)
  .merge(AthletePyschicalsSchema)
  .merge(SubscriptionSchema);
export type AthleteOnBoardingType = z.infer<typeof AthleteOnBoardingSchema>;

export const editSchema = AthleteOnBoardingSchema.omit({
  subscriptionPlanId: true,
});
export type editSchemaType = z.infer<typeof editSchema>;
