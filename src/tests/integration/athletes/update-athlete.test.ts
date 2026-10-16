import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeBatch, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { registerAthlete } from "@/features/athletes/actions/register-athlete";
import { updateAthlete } from "@/features/athletes/actions/update-athlete";
import type { AthleteEditInput, RegistrationInput } from "@/features/athletes/schemas/registration";
import { academyToday } from "@/lib/academy-time";

const yearsAgo = (n: number) => {
  const [y, m, d] = academyToday().split("-");
  return `${Number(y) - n}-${m}-${d}`;
};

/** Registers one athlete (as an admin) and returns the edit form's starting values. */
async function athlete(photos = false) {
  await signedIn("ADMIN");
  const [batch, plan] = await Promise.all([makeBatch(), makePlan(3000)]);
  await db.athleteSequence.upsert({ where: { id: 1 }, create: { id: 1, current: 1 }, update: {} });
  const reg: RegistrationInput = {
    firstName: "Amani", middleName: "", lastName: "Otieno", dateOfBirth: yearsAgo(11), phoneNumber: "", email: "", batch: batch.id,
    guardianName: "Grace Otieno", guardianRelationship: "Mother", guardianPhone: "0712000111", guardianEmail: "",
    bloodGroup: "O+", allergies: [{ name: "Peanuts" }], medicalConditions: [],
    emergencyName: "Grace Otieno", emergencyRelationship: "Mother", emergencyPhone: "0712000111",
    town: "Nairobi", estate: "Kasarani", addressLine1: "", height: "", weight: "", foot: "right", hand: "right", positions: [],
    consentDataUse: true, consentEmergency: true, consentPhotos: photos, consentGivenBy: "Grace Otieno", consentRelationship: "Mother",
    consentMethod: "IN_PERSON", consentFormUrl: "", consentDate: academyToday(), consentLanguage: "en",
    profilePhoto: "", birthCertificate: "", idFront: "", idBack: "", passportCover: "", passportPage: "", subscriptionPlanId: plan.id,
  };
  const res = await registerAthlete(reg);
  expect(res.success).toBe(true);
  const a = await db.athlete.findFirstOrThrow();
  const g = await db.athleteGuardian.findFirstOrThrow();
  const edit: AthleteEditInput = { ...reg };
  return { a, guardianId: g.id, edit };
}

describe("editing an athlete", () => {
  beforeEach(resetDb);

  it("saves an admin's changes and logs what changed", async () => {
    const { a, guardianId, edit } = await athlete();
    const res = await updateAthlete(a.athleteId, { ...edit, estate: "Eastleigh", allergies: [] }, guardianId);
    expect(res).toMatchObject({ success: true });
    expect((await db.athleteAddress.findFirstOrThrow()).estate).toBe("Eastleigh");
    expect((await db.athleteMedicalAndEmergency.findFirstOrThrow()).allergies).toEqual([]);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "UPDATE_ATHLETE" } });
    expect(log.changes).toEqual({ before: { estate: "Kasarani", allergies: ["Peanuts"] }, after: { estate: "Eastleigh", allergies: [] } });
  });

  it("keeps other guardians when the main one is edited", async () => {
    const { a, guardianId, edit } = await athlete();
    await db.athleteGuardian.create({ data: { athleteId: a.athleteId, fullNames: "John Otieno", relationship: "Father", phoneNumber: "0712000222", email: "" } });
    await updateAthlete(a.athleteId, { ...edit, guardianPhone: "0712000333" }, guardianId);
    const guardians = await db.athleteGuardian.findMany({ orderBy: { fullNames: "asc" } });
    expect(guardians.map((g) => [g.fullNames, g.phoneNumber])).toEqual([
      ["Grace Otieno", "0712000333"],
      ["John Otieno", "0712000222"],
    ]);
  });

  it("lets a coach change details but not medical ones", async () => {
    const { a, guardianId, edit } = await athlete();
    await signedIn("COACH");
    expect((await updateAthlete(a.athleteId, { ...edit, estate: "Eastleigh", bloodGroup: "A+" }, guardianId)).success).toBe(true);
    expect((await db.athleteAddress.findFirstOrThrow()).estate).toBe("Eastleigh");
    expect((await db.athleteMedicalAndEmergency.findFirstOrThrow()).bloogGroup).toBe("O+");
  });

  it("lets medical staff change only medical details", async () => {
    const { a, guardianId, edit } = await athlete();
    await signedIn("DOCTOR");
    expect((await updateAthlete(a.athleteId, { ...edit, estate: "Eastleigh", bloodGroup: "A+" }, guardianId)).success).toBe(true);
    expect((await db.athleteAddress.findFirstOrThrow()).estate).toBe("Kasarani");
    expect((await db.athleteMedicalAndEmergency.findFirstOrThrow()).bloogGroup).toBe("A+");
  });

  it("refuses finance staff", async () => {
    const { a, guardianId, edit } = await athlete();
    await signedIn("FINANCE");
    expect((await updateAthlete(a.athleteId, { ...edit, estate: "Eastleigh" }, guardianId)).success).toBe(false);
  });

  it("allows a photo only with photo consent", async () => {
    const without = await athlete(false);
    expect(await updateAthlete(without.a.athleteId, { ...without.edit, profilePhoto: "/uploads/PROFILE/a.jpg" }, without.guardianId)).toMatchObject({
      success: false,
    });
    await resetDb();
    const withConsent = await athlete(true);
    expect((await updateAthlete(withConsent.a.athleteId, { ...withConsent.edit, profilePhoto: "/uploads/PROFILE/a.jpg" }, withConsent.guardianId)).success).toBe(true);
  });
});
