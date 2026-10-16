import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { academyToday } from "@/lib/academy-time";

/** Shared by the registration steps (browser) and the action (server). */

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"] as const;
export const SIDES = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "both", label: "Both" },
] as const;
export const POSITIONS = [
  { value: "Goalkeeper", label: "Goalkeeper" },
  { value: "Defender", label: "Defender" },
  { value: "Midfielder", label: "Midfielder" },
  { value: "Forward", label: "Forward" },
] as const;
export const RELATIONSHIPS = [
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Guardian", label: "Guardian" },
  { value: "Other", label: "Other" },
] as const;

/** Whole years on the academy's today, from "YYYY-MM-DD". */
export function ageOn(dob: string, today = academyToday()) {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

export const ADULT_AGE = 18;

const text = (max = 100) => z.string().trim().max(max, `Keep it under ${max} characters`);
const required = (what: string, max = 100) => text(max).min(1, `Enter ${what}`);
const optionalPhone = z
  .string()
  .trim()
  .refine((v) => !v || normalizePhone(v) !== null, "Enter a Kenyan mobile number, like 0712 345 678")
  .transform((v) => (v ? normalizePhone(v)! : ""));
const optionalEmail = z
  .string()
  .trim()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address, or leave it empty");
const file = z.string().trim().max(300);
const listOf = (what: string) =>
  z
    .array(z.object({ name: text(80) }))
    .max(20, `Up to 20 ${what}s`)
    .transform((rows) => rows.map((r) => r.name).filter(Boolean));

export const athleteFields = z.object({
  // 1. Athlete
  firstName: required("the first name", 60),
  middleName: text(60),
  lastName: required("the last name", 60),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of birth"),
  phoneNumber: optionalPhone,
  email: optionalEmail,
  batch: z.string().min(1, "Choose a batch"),

  // 2. Parent or guardian (required under 18: see the rules below)
  guardianName: text(100),
  guardianRelationship: text(40),
  guardianPhone: optionalPhone,
  guardianEmail: optionalEmail,

  // 3. Medical and emergency
  bloodGroup: z.enum(BLOOD_GROUPS, { error: "Choose a blood group, or Unknown" }),
  // One row per item (react-hook-form useFieldArray needs objects); empty rows are dropped
  allergies: listOf("an allergy"),
  medicalConditions: listOf("a condition"),
  emergencyName: required("the emergency contact's name"),
  emergencyRelationship: required("how they're related", 40),
  emergencyPhone: optionalPhone.refine((v) => v !== "", "Enter the emergency contact's phone"),

  // 4. Address and football
  town: required("the town"),
  estate: required("the estate or area"),
  addressLine1: text(120),
  height: z.string().trim().refine((v) => !v || (Number(v) >= 50 && Number(v) <= 230), "Height in cm, 50 to 230"),
  weight: z.string().trim().refine((v) => !v || (Number(v) >= 10 && Number(v) <= 150), "Weight in kg, 10 to 150"),
  foot: z.enum(["right", "left", "both"]),
  hand: z.enum(["right", "left", "both"]),
  positions: z.array(z.string()).max(4),

  // 5. Consent
  consentDataUse: z.boolean().refine((v) => v, "Tick this to continue"),
  consentEmergency: z.boolean().refine((v) => v, "Tick this to continue"),
  consentPhotos: z.boolean(),
  consentGivenBy: required("who gave consent"),
  consentRelationship: required("their relationship", 40),
  consentMethod: z.enum(["IN_PERSON", "SIGNED_FORM"]),
  consentFormUrl: file,
  consentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date"),
  consentLanguage: z.enum(["en", "sw"]),

  // 6. Photo and documents
  profilePhoto: file,
  birthCertificate: file,
  idFront: file,
  idBack: file,
  passportCover: file,
  passportPage: file,

  // 7. Fee plan
  subscriptionPlanId: z.string().min(1, "Choose a fee plan"),
});

type Input = z.input<typeof athleteFields>;

/**
 * Rules that depend on more than one field. Zod runs a superRefine only once
 * every field is valid, so the step-by-step form also calls this directly.
 */
export function registrationRules(v: Partial<Input>): { path: keyof Input; message: string }[] {
  const out: { path: keyof Input; message: string }[] = [];
  const issue = (path: keyof Input, message: string) => out.push({ path, message });
  const today = academyToday();
  const dob = v.dateOfBirth ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const age = ageOn(dob, today);
    if (dob > today) issue("dateOfBirth", "The date of birth is in the future");
    else if (age < 3) issue("dateOfBirth", "Check the date of birth");
    else if (age > 60) issue("dateOfBirth", "Check the year of birth");
    else if (age < ADULT_AGE) {
      // Children: a parent or guardian is required, and gives consent
      if (!v.guardianName?.trim()) issue("guardianName", "Enter the parent or guardian's name");
      if (!v.guardianRelationship?.trim()) issue("guardianRelationship", "Choose the relationship");
      if (!v.guardianPhone?.trim()) issue("guardianPhone", "Enter the parent or guardian's phone");
      if (v.consentRelationship === "Self") issue("consentRelationship", "Choose the parent or guardian's relationship");
    }
  }
  if (v.consentDate && v.consentDate > today) issue("consentDate", "The consent date is in the future");
  if (v.consentMethod === "SIGNED_FORM" && !v.consentFormUrl) issue("consentFormUrl", "Upload the signed form");
  if (v.profilePhoto && !v.consentPhotos) issue("profilePhoto", "Remove the photo, or tick photos and videos in the consent step");
  return out;
}

export const registrationSchema = athleteFields.superRefine((v, ctx) => {
  for (const r of registrationRules(v as unknown as Input)) ctx.addIssue({ code: "custom", path: [r.path], message: r.message });
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type Registration = z.output<typeof registrationSchema>;

/** Which fields each step checks before moving on. */
export const REGISTRATION_STEPS = [
  { key: "athlete", label: "Athlete", fields: ["firstName", "middleName", "lastName", "dateOfBirth", "phoneNumber", "email", "batch"] },
  { key: "guardian", label: "Parent or guardian", fields: ["guardianName", "guardianRelationship", "guardianPhone", "guardianEmail"] },
  {
    key: "medical",
    label: "Medical and emergency",
    fields: ["bloodGroup", "allergies", "medicalConditions", "emergencyName", "emergencyRelationship", "emergencyPhone"],
  },
  { key: "about", label: "Address and football", fields: ["town", "estate", "addressLine1", "height", "weight", "foot", "hand", "positions"] },
  {
    key: "consent",
    label: "Consent",
    fields: ["consentDataUse", "consentEmergency", "consentPhotos", "consentGivenBy", "consentRelationship", "consentMethod", "consentFormUrl", "consentDate", "consentLanguage"],
  },
  { key: "documents", label: "Photo and documents", fields: ["profilePhoto", "birthCertificate", "idFront", "idBack", "passportCover", "passportPage"] },
  { key: "plan", label: "Fee plan", fields: ["subscriptionPlanId"] },
  { key: "review", label: "Review", fields: [] },
] as const satisfies readonly { key: string; label: string; fields: readonly (keyof RegistrationInput)[] }[];

/** Editing an athlete: the registration fields except consent and fee plan (consent changes from the profile). */
export const athleteEditSchema = athleteFields
  .omit({
    consentDataUse: true,
    consentEmergency: true,
    consentPhotos: true,
    consentGivenBy: true,
    consentRelationship: true,
    consentMethod: true,
    consentFormUrl: true,
    consentDate: true,
    consentLanguage: true,
    subscriptionPlanId: true,
  })
  .superRefine((v, ctx) => {
    for (const r of registrationRules(v as unknown as Partial<Input>).filter((r) => !r.path.startsWith("consent") && r.path !== "profilePhoto")) {
      ctx.addIssue({ code: "custom", path: [r.path], message: r.message });
    }
  });
export type AthleteEditInput = z.input<typeof athleteEditSchema>;

export const MEDICAL_FIELDS = ["bloodGroup", "allergies", "medicalConditions"] as const;
