import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeBatch, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { registerAthlete } from "@/features/athletes/actions/register-athlete";
import type { RegistrationInput } from "@/features/athletes/schemas/registration";
import { academyToday } from "@/lib/academy-time";

const yearsAgo = (n: number) => {
  const [y, m, d] = academyToday().split("-");
  return `${Number(y) - n}-${m}-${d}`;
};

async function form(over: Partial<RegistrationInput> = {}): Promise<RegistrationInput> {
  const [batch, plan] = await Promise.all([makeBatch(), makePlan(4000)]);
  await db.athleteSequence.upsert({ where: { id: 1 }, create: { id: 1, current: 41 }, update: {} });
  return {
    firstName: "Wanjiru",
    middleName: "",
    lastName: "Kamau",
    dateOfBirth: yearsAgo(12),
    phoneNumber: "",
    email: "",
    batch: batch.id,
    guardianName: "Jane Kamau",
    guardianRelationship: "Mother",
    guardianPhone: "+254 712 000 111",
    guardianEmail: "",
    bloodGroup: "O+",
    allergies: [{ name: "Peanuts" }, { name: "" }],
    medicalConditions: [],
    emergencyName: "Jane Kamau",
    emergencyRelationship: "Mother",
    emergencyPhone: "0712000111",
    town: "Nairobi",
    estate: "Kasarani",
    addressLine1: "Mwiki Road",
    height: "140",
    weight: "35",
    foot: "right",
    hand: "right",
    positions: ["Midfielder", "Forward"],
    consentDataUse: true,
    consentEmergency: true,
    consentPhotos: true,
    consentGivenBy: "Jane Kamau",
    consentRelationship: "Mother",
    consentMethod: "IN_PERSON",
    consentFormUrl: "",
    consentDate: academyToday(),
    consentLanguage: "sw",
    profilePhoto: "/uploads/athletes/photo.jpg",
    birthCertificate: "",
    idFront: "",
    idBack: "",
    passportCover: "cover.jpg",
    passportPage: "biodata.jpg",
    subscriptionPlanId: plan.id,
    ...over,
  };
}

describe("registering an athlete", () => {
  beforeEach(resetDb);

  it("creates the athlete, guardian, consent, subscription and first invoice together, and logs it", async () => {
    const { user } = await signedIn("ADMIN");
    const res = await registerAthlete(await form());

    expect(res).toMatchObject({ success: true, athleteId: "ATH-FFA-042" });
    const a = await db.athlete.findFirstOrThrow({
      include: { guardians: true, athleteSubscriptions: true, invoices: true, medical: true, address: true, consents: true, emergencyContacts: true },
    });
    expect(a.status).toBe("PENDING");
    expect(a.positions).toEqual(["Midfielder", "Forward"]);
    expect(a.guardians.map((g) => [g.fullNames, g.phoneNumber, g.email])).toEqual([["Jane Kamau", "0712000111", ""]]);
    expect(a.emergencyContacts[0].phoneNumber).toBe("0712000111");
    expect(a.medical?.allergies).toEqual(["Peanuts"]);
    expect(a.profilePIcture).toBe("/uploads/athletes/photo.jpg");
    expect(a.consents).toMatchObject([
      { version: "1", language: "sw", dataUse: true, emergencyTreatment: true, photos: true, givenByName: "Jane Kamau", method: "IN_PERSON", recordedById: user.id },
    ]);
    expect(a.athleteSubscriptions).toHaveLength(1);
    expect(a.invoices.map((i) => [i.type, Number(i.amountDue), i.status])).toEqual([["SUBSCRIPTION", 4000, "PENDING"]]);
    expect(await db.auditLog.count({ where: { action: "CREATE_ATHLETE", userId: user.id, athleteId: a.id } })).toBe(1);
  });

  it("registers an adult without a guardian, consenting for themselves", async () => {
    await signedIn("ADMIN");
    const res = await registerAthlete(
      await form({ dateOfBirth: yearsAgo(20), guardianName: "", guardianRelationship: "", guardianPhone: "", consentGivenBy: "Wanjiru Kamau", consentRelationship: "Self" }),
    );
    expect(res.success).toBe(true);
    const a = await db.athlete.findFirstOrThrow({ include: { guardians: true, consents: true } });
    expect(a.guardians).toHaveLength(0);
    expect(a.consents[0].givenByRelationship).toBe("Self");
  });

  it("saves nothing when a step fails", async () => {
    await signedIn("ADMIN");
    const res = await registerAthlete(await form({ subscriptionPlanId: "missing-plan" }));
    expect(res).toMatchObject({ success: false, message: "That fee plan is no longer available. Choose another." });
    expect(await db.athlete.count()).toBe(0);
    expect(await db.athleteConsent.count()).toBe(0);
    expect((await db.athleteSequence.findUniqueOrThrow({ where: { id: 1 } })).current).toBe(41);
  });

  it("refuses registration without consent, or a child without a guardian", async () => {
    await signedIn("ADMIN");
    expect(await registerAthlete(await form({ consentDataUse: false }))).toMatchObject({ success: false });
    expect(await registerAthlete(await form({ guardianName: "" }))).toMatchObject({ success: false, message: "Enter the parent or guardian's name" });
    expect(await db.athlete.count()).toBe(0);
  });

  it("refuses a photo without photo consent", async () => {
    await signedIn("ADMIN");
    expect(await registerAthlete(await form({ consentPhotos: false }))).toMatchObject({
      success: false,
      message: "Remove the photo, or tick photos and videos in the consent step",
    });
  });

  it("is refused for coaches and finance", async () => {
    const data = await form();
    await signedIn("COACH");
    expect((await registerAthlete(data)).success).toBe(false);
    await signedIn("FINANCE");
    expect((await registerAthlete(data)).success).toBe(false);
    expect(await db.athlete.count()).toBe(0);
  });

  it("saves the passport cover and bio-data page in the right fields", async () => {
    await signedIn("ADMIN");
    await registerAthlete(await form());
    const a = await db.athlete.findFirstOrThrow();
    expect([a.passportCover, a.passportBioData]).toEqual(["cover.jpg", "biodata.jpg"]);
  });
});
