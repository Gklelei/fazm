import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeBatch, makePlan, resetDb, signedIn } from "@/tests/support/db";
import AthleteOnboardingAction from "@/features/athletes/actions/onboard-athlete";

async function form() {
  const [batch, plan] = await Promise.all([makeBatch(), makePlan(4000)]);
  await db.athleteSequence.create({ data: { id: 1, current: 41 } });
  return {
    firstName: "Wanjiru",
    lastName: "Kamau",
    middleName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "2014-05-01",
    batch: batch.id,
    profilePIcture: "",
    bloodGroup: "O+",
    allergies: "None",
    medicalConditions: "None",
    emergencyContactName: "Jane Kamau",
    emergencyContactPhone: "+254712000111",
    emergencyContactRelationship: "Mother",
    country: "Kenya",
    estate: "Kasarani",
    town: "Nairobi",
    addressLine1: "Mwiki Road",
    addressLine2: "",
    guardianFullNames: "Jane Kamau",
    guardianRelationShip: "Mother",
    guardianEmail: "jane@example.test",
    guardianPhoneNumber: "+254712000111",
    birthCertificate: "",
    idFront: "",
    idBack: "",
    passportCover: "cover.jpg",
    passportPage: "biodata.jpg",
    height: "140",
    weight: "35",
    dominantFoot: "RIGHT",
    dominantHand: "RIGHT",
    playingPositions: "Midfielder, Winger",
    subscriptionPlanId: plan.id,
  };
}

describe("registering an athlete", () => {
  beforeEach(resetDb);

  it("creates the athlete, guardian, subscription and first invoice together, and logs it", async () => {
    const { user } = await signedIn("ADMIN");
    const res = await AthleteOnboardingAction(await form());

    expect(res.status).toBe("SUCCESS");
    const athlete = await db.athlete.findFirstOrThrow({ include: { guardians: true, athleteSubscriptions: true, invoices: true, medical: true, address: true } });
    expect(athlete.athleteId).toBe("ATH-FFA-042");
    expect(athlete.status).toBe("PENDING");
    expect(athlete.positions).toEqual(["Midfielder", "Winger"]);
    expect(athlete.guardians.map((g) => g.fullNames)).toEqual(["Jane Kamau"]);
    expect(athlete.athleteSubscriptions).toHaveLength(1);
    expect(athlete.invoices.map((i) => [i.type, Number(i.amountDue), i.status])).toEqual([["SUBSCRIPTION", 4000, "PENDING"]]);
    expect(await db.auditLog.count({ where: { action: "CREATE_ATHLETE", userId: user.id } })).toBe(1);
  });

  it("saves nothing when a step fails", async () => {
    await signedIn("ADMIN");
    const data = await form();
    data.subscriptionPlanId = "missing-plan";

    const res = await AthleteOnboardingAction(data);

    expect(res.status).toBe("ERROR");
    expect(await db.athlete.count()).toBe(0);
    expect((await db.athleteSequence.findUniqueOrThrow({ where: { id: 1 } })).current).toBe(41);
  });

  it("is refused for coaches and finance", async () => {
    const data = await form();
    await signedIn("COACH");
    expect((await AthleteOnboardingAction(data)).status).toBe("ERROR");
    await signedIn("FINANCE");
    expect((await AthleteOnboardingAction(data)).status).toBe("ERROR");
  });

  // Known bugs, kept visible: these pass while the bug exists and fail once it's fixed.
  it.fails("KNOWN BUG: saves the passport cover and bio-data page in the right fields", async () => {
    await signedIn("ADMIN");
    await AthleteOnboardingAction(await form());
    const a = await db.athlete.findFirstOrThrow();
    expect([a.passportCover, a.passportBioData]).toEqual(["cover.jpg", "biodata.jpg"]);
  });

  it.fails("KNOWN BUG: answers invalid data with an error instead of throwing", async () => {
    await signedIn("ADMIN");
    const data = { ...(await form()), firstName: "" };
    await expect(AthleteOnboardingAction(data)).resolves.toMatchObject({ status: "ERROR" });
  });
});
