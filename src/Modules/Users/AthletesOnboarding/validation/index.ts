import z from "zod";
import { AddressInfoSchema } from "./AddressInfoSchema";
import { AthleteGuardianSchema } from "./AthleteGuardian";
import { MedicalsEmergencySchema } from "./Medicals&EmergencySchema";
import { personalInfoSchema } from "./personalInfoSchema";
import {
  AthleteDoccumentsSchema,
  AthletePyschicalsSchema,
} from "./AthleteDoccuments";
import { SubscriptionSchema } from "./SubscriptionSchema";

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
