import z from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));
const requiredString = z.string().trim().min(1, "This field is required");

export const AthleteDoccumentsSchema = z.object({
  birthCertificate: optionalString,
  idFront: optionalString,
  idBack: optionalString,
  passportCover: optionalString,
  passportPage: optionalString,
});

export const AthletePyschicalsSchema = z.object({
  height: requiredString,
  weight: requiredString,
  dominantFoot: requiredString,
  dominantHand: requiredString,
  playingPositions: requiredString,
});
