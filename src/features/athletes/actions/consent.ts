"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { academyInstant, academyToday } from "@/lib/academy-time";
import { CONSENT_VERSION } from "@/features/athletes/lib/consent-text";
import { ADULT_AGE, ageOn, consentSchema, type ConsentInput } from "@/features/athletes/schemas/registration";
import { athletePath } from "@/features/athletes/lib/athlete-links";

async function findAthlete(athleteId: string) {
  const a = await db.athlete.findUnique({
    where: { athleteId },
    select: { id: true, athleteId: true, firstName: true, lastName: true, dateOfBirth: true, profilePIcture: true, isArchived: true },
  });
  if (!a || a.isArchived) throw new ActionError("That athlete no longer exists.");
  return a;
}

/**
 * Records consent for an athlete as a new row (history is kept). Without
 * photo consent the athlete's photo is removed.
 */
export async function recordConsent(athleteId: string, input: ConsentInput) {
  return asRole("admin", async (user) => {
    const v = consentSchema.parse(input);
    const a = await findAthlete(athleteId);
    if (v.consentRelationship === "Self" && /^\d{4}-\d{2}-\d{2}$/.test(a.dateOfBirth) && ageOn(a.dateOfBirth) < ADULT_AGE) {
      throw new ActionError("Choose the parent or guardian's relationship");
    }
    const previous = await db.athleteConsent.findFirst({ where: { athleteId: a.id }, orderBy: { createdAt: "desc" } });
    await db.$transaction([
      db.athleteConsent.create({
        data: {
          athleteId: a.id,
          version: CONSENT_VERSION,
          language: v.consentLanguage,
          dataUse: v.consentDataUse,
          emergencyTreatment: v.consentEmergency,
          photos: v.consentPhotos,
          givenByName: v.consentGivenBy,
          givenByRelationship: v.consentRelationship,
          method: v.consentMethod,
          formUrl: v.consentFormUrl || null,
          givenAt: academyInstant(v.consentDate, "12:00"),
          recordedById: user.id,
        },
      }),
      ...(!v.consentPhotos && a.profilePIcture ? [db.athlete.update({ where: { id: a.id }, data: { profilePIcture: "" } })] : []),
    ]);
    await createAuditLog({
      action: previous ? "UPDATE_CONSENT" : "RECORD_CONSENT",
      resource: "Athlete",
      details: `${previous ? "Updated" : "Recorded"} consent for ${a.firstName} ${a.lastName} from ${v.consentGivenBy} (${v.consentRelationship}); photos ${v.consentPhotos ? "yes" : "no"}${!v.consentPhotos && a.profilePIcture ? ", photo removed" : ""}`,
      userId: user.id,
      athleteId: a.id,
      changes: previous
        ? {
            before: { photos: previous.photos, givenBy: previous.givenByName },
            after: { photos: v.consentPhotos, givenBy: v.consentGivenBy },
          }
        : null,
    });
    revalidatePath(athletePath(athleteId));
    revalidatePath("/players");
    return { success: true, message: "Consent saved." };
  });
}

/** Withdraws photos and videos consent, keeping the rest, and removes the photo. */
export async function withdrawPhotoConsent(athleteId: string) {
  return asRole("admin", async (user) => {
    const a = await findAthlete(athleteId);
    const current = await db.athleteConsent.findFirst({ where: { athleteId: a.id }, orderBy: { createdAt: "desc" } });
    if (!current?.photos) throw new ActionError("Photos and videos consent isn't recorded for this athlete.");
    await db.$transaction([
      db.athleteConsent.create({
        data: {
          athleteId: a.id,
          version: current.version,
          language: current.language,
          dataUse: current.dataUse,
          emergencyTreatment: current.emergencyTreatment,
          photos: false,
          givenByName: current.givenByName,
          givenByRelationship: current.givenByRelationship,
          method: current.method,
          formUrl: current.formUrl,
          givenAt: academyInstant(academyToday(), "12:00"),
          recordedById: user.id,
          note: "Photos and videos withdrawn",
        },
      }),
      db.athlete.update({ where: { id: a.id }, data: { profilePIcture: "" } }),
    ]);
    await createAuditLog({
      action: "WITHDRAW_PHOTO_CONSENT",
      resource: "Athlete",
      details: `Withdrew photos and videos consent for ${a.firstName} ${a.lastName}; photo removed`,
      userId: user.id,
      athleteId: a.id,
    });
    revalidatePath(athletePath(athleteId));
    revalidatePath("/players");
    return { success: true, message: "Photo consent withdrawn and the photo removed." };
  });
}
