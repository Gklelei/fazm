"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { academyInstant } from "@/lib/academy-time";
import { BILLING_DAY, nextMonthlyBillingDate } from "@/lib/billing";
import { nextDocumentNumbers } from "@/lib/document-numbers";
import { nextAthleteId } from "@/lib/athlete-numbers";
import { CONSENT_VERSION } from "@/features/athletes/lib/consent-text";
import { discountNewFeesInvoice } from "@/features/coupons/lib/engine";
import { CONSENT_ENABLED } from "@/features/athletes/lib/consent-switch";
import { ageOn, missingDocuments, registrationSchema, type RegistrationInput } from "@/features/athletes/schemas/registration";
import { getSettings } from "@/lib/settings";
import { inBackground } from "@/lib/background";
import { emailInvoice } from "@/features/invoices/lib/emails";

/**
 * Monthly is unified to the 30th of next month (see src/lib/billing.ts).
 * Others stay interval-based.
 */
function nextBillingByInterval(now: Date, interval: string) {
  const next = new Date(now);
  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;
    case "MONTHLY":
      return nextMonthlyBillingDate(now, BILLING_DAY);
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      // safe default: treat as monthly with unified billing
      return nextMonthlyBillingDate(now, BILLING_DAY);
  }
}

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

      // ---------- Invoice number ----------
      const [invoiceNumber] = await nextDocumentNumbers(ctx, "INV", 1, now);

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

      const planAmount = new Prisma.Decimal(plan.amount);
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

      // ---------- Subscription ----------
      const subscription = await ctx.athleteSubscription.create({
        data: {
          athleteId: athlete.athleteId,
          subscriptionPlanId: plan.id,
          status: "ACTIVE",
          startDate: currentPeriodStart,
          currentPeriodStart,
          currentPeriodEnd,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          trialStart: null,
          trialEnd: null,
          updatedBy: user.email || "system",
        },
      });

      // ---------- First invoice: the full plan amount ----------
      const firstInvoice = await ctx.invoice.create({
        data: {
          athleteId: athlete.athleteId,
          athleteSubscriptionId: subscription.id,
          subscriptionPlanId: plan.id,
          invoiceNumber,
          type: "SUBSCRIPTION",
          description: `Initial ${plan.name} subscription (full amount)`,
          lines: {
            create: { position: 0, description: plan.name, quantity: 1, unitAmount: planAmount, amount: planAmount, subscriptionPlanId: plan.id },
          },
          unitAmount: planAmount,
          quantity: 1,
          amountDue: planAmount,
          amountPaid: new Prisma.Decimal(0),
          status: "PENDING",
          dueDate: currentPeriodEnd,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          isRecurring: true,
          nextBillingDate: currentPeriodEnd,
          issuedBy: user.email || "system",
        },
      });
      // Discounted like every fees invoice (the sibling discount, when it applies)
      await discountNewFeesInvoice(ctx, firstInvoice.id);

      return { id: athlete.id, athleteId, invoiceNumber };
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
