import { describe, expect, it } from "vitest";
import { ageOn, registrationSchema, type RegistrationInput } from "@/features/athletes/schemas/registration";
import { academyToday } from "@/lib/academy-time";

const yearsAgo = (n: number) => {
  const [y, m, d] = academyToday().split("-");
  return `${Number(y) - n}-${m}-${d}`;
};

const child = (over: Partial<RegistrationInput> = {}): RegistrationInput => ({
  firstName: "Amani",
  middleName: "",
  lastName: "Otieno",
  dateOfBirth: yearsAgo(12),
  phoneNumber: "",
  email: "",
  batch: "u13",
  guardianName: "Grace Otieno",
  guardianRelationship: "Mother",
  guardianPhone: "0712 345 678",
  guardianEmail: "",
  bloodGroup: "UNKNOWN",
  allergies: [],
  medicalConditions: [],
  emergencyName: "Grace Otieno",
  emergencyRelationship: "Mother",
  emergencyPhone: "+254712345678",
  town: "Nairobi",
  estate: "Eastleigh",
  addressLine1: "",
  height: "",
  weight: "",
  foot: "right",
  hand: "right",
  positions: [],
  consentDataUse: true,
  consentEmergency: true,
  consentPhotos: false,
  consentGivenBy: "Grace Otieno",
  consentRelationship: "Mother",
  consentMethod: "IN_PERSON",
  consentFormUrl: "",
  consentDate: academyToday(),
  consentLanguage: "en",
  profilePhoto: "",
  birthCertificate: "",
  idFront: "",
  idBack: "",
  passportCover: "",
  passportPage: "",
  subscriptionPlanId: "plan",
  ...over,
});
const problems = (v: RegistrationInput) => {
  const r = registrationSchema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("registration rules", () => {
  it("accepts a complete child registration and stores phones the local way", () => {
    const r = registrationSchema.parse(child());
    expect([r.guardianPhone, r.emergencyPhone]).toEqual(["0712345678", "0712345678"]);
  });

  it("requires a parent or guardian under 18", () => {
    expect(problems(child({ guardianName: "", guardianPhone: "" }))).toMatchObject({
      guardianName: "Enter the parent or guardian's name",
      guardianPhone: "Enter the parent or guardian's phone",
    });
  });

  it("lets an adult register without a guardian and consent for themselves", () => {
    expect(problems(child({ dateOfBirth: yearsAgo(19), guardianName: "", guardianRelationship: "", guardianPhone: "", consentGivenBy: "Amani Otieno", consentRelationship: "Self" }))).toEqual({});
  });

  it("refuses self-consent under 18", () => {
    expect(problems(child({ consentRelationship: "Self" }))).toHaveProperty("consentRelationship");
  });

  it("needs both required consents", () => {
    expect(Object.keys(problems(child({ consentDataUse: false, consentEmergency: false })))).toEqual(["consentDataUse", "consentEmergency"]);
  });

  it("allows a photo only with photo consent", () => {
    expect(problems(child({ profilePhoto: "/uploads/athletes/a.jpg" }))).toHaveProperty("profilePhoto");
    expect(problems(child({ profilePhoto: "/uploads/athletes/a.jpg", consentPhotos: true }))).toEqual({});
  });

  it("asks for the signed form when that's how consent was given", () => {
    expect(problems(child({ consentMethod: "SIGNED_FORM" }))).toHaveProperty("consentFormUrl");
  });

  it("refuses impossible dates of birth", () => {
    expect(problems(child({ dateOfBirth: yearsAgo(1) }))).toHaveProperty("dateOfBirth");
    expect(problems(child({ dateOfBirth: "2999-01-01" }))).toHaveProperty("dateOfBirth");
  });

  it("refuses a phone that isn't a Kenyan mobile", () => {
    expect(problems(child({ guardianPhone: "12345" }))).toHaveProperty("guardianPhone");
  });

  it("counts age by the birthday", () => {
    expect(ageOn("2010-06-15", "2026-06-14")).toBe(15);
    expect(ageOn("2010-06-15", "2026-06-15")).toBe(16);
  });
});
