import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, resetDb, signedIn } from "@/tests/support/db";
import { recordConsent, withdrawPhotoConsent } from "@/features/athletes/actions/consent";
import type { ConsentInput } from "@/features/athletes/schemas/registration";
import { academyToday } from "@/lib/academy-time";

const consent = (over: Partial<ConsentInput> = {}): ConsentInput => ({
  consentDataUse: true,
  consentEmergency: true,
  consentPhotos: true,
  consentGivenBy: "Grace Otieno",
  consentRelationship: "Mother",
  consentMethod: "IN_PERSON",
  consentFormUrl: "",
  consentDate: academyToday(),
  consentLanguage: "en",
  ...over,
});

describe("consent from the profile", () => {
  beforeEach(resetDb);

  it("records consent for an existing athlete, then keeps history on update", async () => {
    const { user } = await signedIn("ADMIN");
    const a = await makeAthlete();
    expect((await recordConsent(a.athleteId, consent())).success).toBe(true);
    expect((await recordConsent(a.athleteId, consent({ consentLanguage: "sw" }))).success).toBe(true);
    const rows = await db.athleteConsent.findMany({ where: { athleteId: a.id }, orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => [r.language, r.recordedById])).toEqual([
      ["en", user.id],
      ["sw", user.id],
    ]);
    expect(await db.auditLog.count({ where: { action: { in: ["RECORD_CONSENT", "UPDATE_CONSENT"] }, athleteId: a.id } })).toBe(2);
  });

  it("removes the photo when photo consent is withdrawn", async () => {
    await signedIn("ADMIN");
    const a = await makeAthlete();
    await recordConsent(a.athleteId, consent());
    await db.athlete.update({ where: { id: a.id }, data: { profilePIcture: "/uploads/PROFILE/a.jpg" } });

    expect(await withdrawPhotoConsent(a.athleteId)).toMatchObject({ success: true });
    const latest = await db.athleteConsent.findFirstOrThrow({ where: { athleteId: a.id }, orderBy: { createdAt: "desc" } });
    expect(latest).toMatchObject({ photos: false, dataUse: true, note: "Photos and videos withdrawn" });
    expect((await db.athlete.findUniqueOrThrow({ where: { id: a.id } })).profilePIcture).toBe("");
  });

  it("is for admins only", async () => {
    const a = await makeAthlete();
    for (const role of ["COACH", "FINANCE", "DOCTOR"] as const) {
      await signedIn(role);
      expect((await recordConsent(a.athleteId, consent())).success).toBe(false);
    }
    expect(await db.athleteConsent.count()).toBe(0);
  });
});
