import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { hasRole } from "@/lib/roles";
import { academyToday } from "@/lib/academy-time";
import { logView } from "@/lib/audit-view";
import { PageHeader } from "@/components/shared/PageHeader";
import { resolveAthleteId } from "@/features/athletes/lib/athlete-ref";
import { athleteEditPath, athleteSlug } from "@/features/athletes/lib/athlete-links";
import { EditAthlete } from "@/features/athletes/components/register/EditAthlete";
import { BLOOD_GROUPS, type RegistrationInput } from "@/features/athletes/schemas/registration";

export const metadata: Metadata = { title: "Edit athlete" };

const side = (v: string | null | undefined) => (v === "left" || v === "both" ? v : "right");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const ref = (await params).id;
  const id = await resolveAthleteId(ref);
  if (!id) notFound();
  if (ref !== athleteSlug(id)) redirect(athleteEditPath(id));
  const session = await auth.api.getSession({ headers: await headers() });
  const a = await db.athlete.findUnique({
    where: { athleteId: id },
    include: {
      guardians: { take: 1 },
      medical: true,
      address: true,
      emergencyContacts: { take: 1 },
      consents: { orderBy: { createdAt: "desc" }, take: 1, select: { photos: true } },
    },
  });
  if (!a || a.isArchived) notFound();
  await logView({
    resource: "Athlete",
    recordId: a.athleteId,
    athleteId: a.id,
    details: `Opened ${a.firstName} ${a.lastName}'s record for editing (${a.athleteId})`,
  });

  const g = a.guardians[0];
  const e = a.emergencyContacts[0];
  const blood = a.medical?.bloogGroup;
  const values: RegistrationInput = {
    firstName: a.firstName,
    middleName: a.middleName ?? "",
    lastName: a.lastName,
    dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(a.dateOfBirth) ? a.dateOfBirth : "",
    phoneNumber: a.phoneNumber ?? "",
    email: a.email ?? "",
    batch: a.batchesId,
    guardianName: g?.fullNames ?? "",
    guardianRelationship: g?.relationship ?? "",
    guardianPhone: g?.phoneNumber ?? "",
    guardianEmail: g?.email ?? "",
    bloodGroup: (BLOOD_GROUPS as readonly string[]).includes(blood ?? "") ? (blood as RegistrationInput["bloodGroup"]) : "UNKNOWN",
    allergies: (a.medical?.allergies ?? []).map((name) => ({ name })),
    medicalConditions: (a.medical?.medicalConditions ?? []).map((name) => ({ name })),
    emergencyName: e?.name ?? "",
    emergencyRelationship: e?.relationship ?? "",
    emergencyPhone: e?.phoneNumber ?? "",
    town: a.address?.town ?? "",
    estate: a.address?.estate ?? "",
    addressLine1: a.address?.addressLine1 ?? "",
    height: a.height ?? "",
    weight: a.weight ?? "",
    foot: side(a.foot?.toLowerCase()),
    hand: side(a.hand?.toLowerCase()),
    positions: a.positions,
    profilePhoto: a.profilePIcture ?? "",
    birthCertificate: a.birthCertificate ?? "",
    idFront: a.nationalIdFront ?? "",
    idBack: a.nationalIdBack ?? "",
    passportCover: a.passportCover ?? "",
    passportPage: a.passportBioData ?? "",
    // Not edited here; the photo field follows the recorded photo consent
    consentPhotos: a.consents[0]?.photos ?? false,
    consentDataUse: true,
    consentEmergency: true,
    consentGivenBy: "",
    consentRelationship: "",
    consentMethod: "IN_PERSON",
    consentFormUrl: "",
    consentDate: academyToday(),
    consentLanguage: "en",
    subscriptionPlanId: "",
  };

  const role = session?.user.role;
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${a.firstName} ${a.lastName}`} description={a.athleteId} />
      <EditAthlete
        athleteId={a.athleteId}
        guardianId={g?.id}
        values={values}
        canEditMedical={hasRole(role, "medical")}
        canEditOther={role !== "DOCTOR"}
      />
    </div>
  );
}
