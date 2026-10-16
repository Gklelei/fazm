"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { hasRole } from "@/lib/roles";
import { ageOn, athleteEditSchema, type AthleteEditInput } from "@/features/athletes/schemas/registration";

/**
 * Saves the edit page. Admins change everything; coaches everything except
 * medical details; medical staff only medical details. The edited guardian
 * is changed in place, so other guardians on the athlete are kept.
 */
export async function updateAthlete(athleteId: string, input: AthleteEditInput, guardianId?: string) {
  return asRole("athletes", async (user) => {
    const v = athleteEditSchema.parse(input);
    const before = await db.athlete.findUnique({
      where: { athleteId },
      include: {
        medical: true,
        address: true,
        emergencyContacts: { take: 1 },
        guardians: guardianId ? { where: { id: guardianId } } : { take: 1 },
        consents: { orderBy: { createdAt: "desc" }, take: 1, select: { photos: true } },
      },
    });
    if (!before || before.isArchived) throw new ActionError("That athlete no longer exists.");

    const medical = hasRole(user.role, "medical");
    const others = user.role !== "DOCTOR";
    const photoConsent = before.consents[0]?.photos ?? false;
    if (others && v.profilePhoto && v.profilePhoto !== before.profilePIcture && !photoConsent) {
      throw new ActionError("Remove the photo, or record photos and videos consent on the profile first.");
    }
    if (others && !(await db.batches.findFirst({ where: { id: v.batch }, select: { id: true } }))) {
      throw new ActionError("That batch is no longer available. Choose another.");
    }

    const guardian = before.guardians[0];
    const emergency = before.emergencyContacts[0];

    await db.$transaction(async (tx) => {
      if (others) {
        await tx.athlete.update({
          where: { athleteId },
          data: {
            firstName: v.firstName,
            middleName: v.middleName || null,
            lastName: v.lastName,
            email: v.email || null,
            phoneNumber: v.phoneNumber,
            dateOfBirth: v.dateOfBirth,
            age: ageOn(v.dateOfBirth),
            batchesId: v.batch,
            profilePIcture: v.profilePhoto,
            height: v.height,
            weight: v.weight,
            foot: v.foot,
            hand: v.hand,
            positions: v.positions,
            birthCertificate: v.birthCertificate,
            nationalIdFront: v.idFront,
            nationalIdBack: v.idBack,
            passportCover: v.passportCover,
            passportBioData: v.passportPage,
            address: {
              upsert: {
                create: { country: "Kenya", town: v.town, estate: v.estate, addressLine1: v.addressLine1, addressLine2: "" },
                update: { town: v.town, estate: v.estate, addressLine1: v.addressLine1 },
              },
            },
          },
        });
        const contact = { name: v.emergencyName, phoneNumber: v.emergencyPhone, relationship: v.emergencyRelationship };
        if (emergency) await tx.athleteEmergencyContact.update({ where: { id: emergency.id }, data: contact });
        else await tx.athleteEmergencyContact.create({ data: { ...contact, athleteId: before.id } });

        const g = { fullNames: v.guardianName, relationship: v.guardianRelationship, phoneNumber: v.guardianPhone, email: v.guardianEmail };
        if (guardian && v.guardianName) await tx.athleteGuardian.update({ where: { id: guardian.id }, data: g });
        else if (guardian) await tx.athleteGuardian.delete({ where: { id: guardian.id } });
        else if (v.guardianName) await tx.athleteGuardian.create({ data: { ...g, athleteId } });
      }
      if (medical) {
        const m = { bloogGroup: v.bloodGroup, allergies: v.allergies, medicalConditions: v.medicalConditions };
        await tx.athleteMedicalAndEmergency.upsert({ where: { athleteId }, create: { ...m, athleteId }, update: m });
      }
    });

    const changes = diffFields(
      {
        ...(others && {
          firstName: before.firstName,
          middleName: before.middleName ?? "",
          lastName: before.lastName,
          dateOfBirth: before.dateOfBirth,
          phoneNumber: before.phoneNumber ?? "",
          email: before.email ?? "",
          batch: before.batchesId,
          guardian: guardian ? `${guardian.fullNames}, ${guardian.relationship}, ${guardian.phoneNumber}` : "",
          emergencyContact: emergency ? `${emergency.name}, ${emergency.relationship}, ${emergency.phoneNumber}` : "",
          town: before.address?.town ?? "",
          estate: before.address?.estate ?? "",
          positions: before.positions,
          photo: before.profilePIcture ?? "",
        }),
        ...(medical && {
          bloodGroup: before.medical?.bloogGroup ?? "",
          allergies: before.medical?.allergies ?? [],
          medicalConditions: before.medical?.medicalConditions ?? [],
        }),
      },
      {
        ...(others && {
          firstName: v.firstName,
          middleName: v.middleName,
          lastName: v.lastName,
          dateOfBirth: v.dateOfBirth,
          phoneNumber: v.phoneNumber,
          email: v.email,
          batch: v.batch,
          guardian: v.guardianName ? `${v.guardianName}, ${v.guardianRelationship}, ${v.guardianPhone}` : "",
          emergencyContact: `${v.emergencyName}, ${v.emergencyRelationship}, ${v.emergencyPhone}`,
          town: v.town,
          estate: v.estate,
          positions: v.positions,
          photo: v.profilePhoto,
        }),
        ...(medical && { bloodGroup: v.bloodGroup, allergies: v.allergies, medicalConditions: v.medicalConditions }),
      },
    );

    revalidatePath("/players");
    revalidatePath(`/players/user-profile/${athleteId}`);
    await createAuditLog({
      action: "UPDATE_ATHLETE",
      resource: "Athlete",
      details: `Updated ${v.firstName} ${v.lastName}'s details (${athleteId})${!others ? ": medical only" : !medical ? ", not medical" : ""}`,
      userId: user.id,
      athleteId: before.id,
      changes,
    });
    return { success: true, message: "Changes saved." };
  });
}
