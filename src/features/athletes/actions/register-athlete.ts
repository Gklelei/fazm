"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { academyInstant } from "@/lib/academy-time";
import { nextAthleteId } from "@/lib/athlete-numbers";
import { CONSENT_VERSION } from "@/features/athletes/lib/consent-text";
import { nextBillingByInterval, raisePlanInvoice, startPlan } from "@/features/athletes/lib/plan-change";
import { CONSENT_ENABLED } from "@/features/athletes/lib/consent-switch";
import { ageOn, missingDocuments, registrationSchema, type RegistrationInput } from "@/features/athletes/schemas/registration";
import { getSettings } from "@/lib/settings";
import { inBackground } from "@/lib/background";
import { emailInvoice } from "@/features/invoices/lib/emails";

/**
 * Registers an athlete in one transaction: the athlete with guardian,
 * medical, address and emergency contact; their consent; the fee plan
 * subscription; and the first invoice for the full plan amount.
 */
export async function registerAthlete(input: RegistrationInput) {
  return asRole("admin", async (user) => {
    const v = registrationSchema.parse(input);
    const settings = await getSettings();
    const missing = missingDocuments(v as never, settings.requiredDocuments);
    if (missing.length) throw new ActionError(missing[0].message);

    const created = await db.$transaction(async (ctx) => {
      const now = new Date();

      // ---------- Fee plan ----------
      const plan = await ctx.subscriptionPlan.findFirst({
        where: { id: v.subscriptionPlanId, isActive: true, isArchived: false },
        select: { id: true, interval: true, amount: true, name: true, programmeId: true },
      });
      if (!plan) throw new ActionError("That fee plan is no longer available. Choose another.");
      const batch = await ctx.batches.findFirst({ where: { id: v.batch, isArchived: false }, select: { programmeId: true } });
      if (!batch) throw new ActionError("That batch is no longer available. Choose another.");
      if (plan.programmeId && plan.programmeId !== batch.programmeId) {
        throw new ActionError(`${plan.name} is for another programme. Choose a plan for this batch.`);
      }

      // ---------- Athlete number: counted in the batch's programme ----------
      const athleteId = await nextAthleteId(ctx, batch.programmeId);

      const currentPeriodStart = now;
      const currentPeriodEnd = nextBillingByInterval(now, plan.interval);

      // ---------- Athlete ----------
      const athlete = await ctx.athlete.create({
        data: {
          athleteId,
          firstName: v.firstName,
          middleName: v.middleName || null,
          lastName: v.lastName,
          email: v.email || undefined,
          phoneNumber: v.phoneNumber,
          dateOfBirth: v.dateOfBirth,
          age: ageOn(v.dateOfBirth),
          batchesId: v.batch,
          // A photo only with photo consent (the schema checks it too), while consent is on
          profilePIcture: !CONSENT_ENABLED || v.consentPhotos ? v.profilePhoto : "",
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
            create: { country: "Kenya", town: v.town, estate: v.estate, addressLine1: v.addressLine1, addressLine2: "" },
          },
          emergencyContacts: {
            create: { name: v.emergencyName, phoneNumber: v.emergencyPhone, relationship: v.emergencyRelationship },
          },
          ...(v.guardianName && {
            guardians: {
              create: {
                fullNames: v.guardianName,
                relationship: v.guardianRelationship,
                phoneNumber: v.guardianPhone,
                email: v.guardianEmail,
              },
            },
          }),
          medical: {
            create: { bloogGroup: v.bloodGroup, allergies: v.allergies, medicalConditions: v.medicalConditions },
          },
          // No consent is recorded while consent is switched off
          ...(CONSENT_ENABLED
            ? {
                consents: {
                  create: {
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
                },
              }
            : {}),
        },
      });

      // ---------- Fee plan, and its first bill: the full plan amount ----------
      const by = user.email || "system";
      const subscription = await startPlan(ctx, { athleteId: athlete.athleteId, plan, start: currentPeriodStart, end: currentPeriodEnd, by });
      const firstInvoice = await raisePlanInvoice(ctx, {
        athleteId: athlete.athleteId,
        subscriptionId: subscription.id,
        plan,
        start: currentPeriodStart,
        end: currentPeriodEnd,
        description: `Initial ${plan.name} subscription (full amount)`,
        by,
      });

      return { id: athlete.id, athleteId, invoiceNumber: firstInvoice.invoiceNumber };
    });

    revalidatePath("/players");
    inBackground(() => emailInvoice(created.invoiceNumber));
    revalidatePath("/invoices");
    await createAuditLog({
      action: "CREATE_ATHLETE",
      resource: "Athlete",
      details: CONSENT_ENABLED
        ? `Registered ${v.firstName} ${v.lastName} (${created.athleteId}); consent from ${v.consentGivenBy} (${v.consentRelationship}), photos ${v.consentPhotos ? "yes" : "no"}; first invoice ${created.invoiceNumber}`
        : `Registered ${v.firstName} ${v.lastName} (${created.athleteId}); first invoice ${created.invoiceNumber}`,
      userId: user.id,
      athleteId: created.id,
    });

    return {
      success: true as const,
      message: `${v.firstName} ${v.lastName} is registered as ${created.athleteId}.`,
      athleteId: created.athleteId,
    };
  });
}
