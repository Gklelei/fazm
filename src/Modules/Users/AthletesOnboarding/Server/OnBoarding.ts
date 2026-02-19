"use server";

import { db } from "@/lib/prisma";
import { AthleteOnBoardingSchema, AthleteOnBoardingType } from "../validation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

type ActionPromise =
  | { status: "SUCCESS"; successMessage: string }
  | { status: "ERROR"; errorMessage: string };

// ----------------- Billing policy -----------------
const BILLING_DAY = 30; // unified monthly billing day

/**
 * You said you reversed the rule:
 * - BEFORE 15th => HALF
 * - 15th and after => FULL
 *
 * If you want the original rule, flip the ternary.
 */
function proratedInitialFactor(now: Date) {
  return now.getDate() > 15 ? 0.5 : 1;
}

function toDecimal(value: number | Prisma.Decimal) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

// ----------------- Small utils -----------------
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseCSV(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function clampToDay(year: number, monthIndex0: number, day: number) {
  const dim = daysInMonth(year, monthIndex0);
  const clamped = Math.min(day, dim);
  return new Date(year, monthIndex0, clamped, 0, 0, 0, 0);
}

/**
 * Returns the 30th of NEXT month (or last day if month doesn't have 30, e.g. Feb).
 * Example: any day in Feb -> Mar 30
 * Example: any day in Jan -> Feb 28/29 (clamped)
 */
function nextMonthlyBillingDate(now: Date, billingDay = BILLING_DAY) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const nextMonthDate = new Date(year, month + 1, 1);
  return clampToDay(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth(),
    billingDay,
  );
}

/**
 * Monthly is unified to the 30th of next month.
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
export function calculateAge({ dob }: { dob: Date | string }) {
  if (!dob) return null;

  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

const AthleteOnboardingAction = async (
  data: AthleteOnBoardingType,
): Promise<ActionPromise> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      status: "ERROR",
      errorMessage: "You must be logged in to perform this action.",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      status: "ERROR",
      errorMessage:
        "Access denied. This action requires administrator permissions.",
    };
  }

  const validatedData = AthleteOnBoardingSchema.parse(data);

  try {
    await db.$transaction(async (ctx) => {
      const now = new Date();

      // ---------- Invoice number ----------
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const todaysCount = await ctx.invoice.count({
        where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      });
      const invoiceSequence = String(todaysCount + 1).padStart(3, "0");
      const generatedInvoiceNumber = `INV-${datePart}-${invoiceSequence}`;

      // ---------- Athlete ID ----------
      const sequence = await ctx.athleteSequence.update({
        where: { id: 1 },
        data: { current: { increment: 1 } },
        select: { current: true },
      });
      const athleteId = `ATH-FFA-${String(sequence.current).padStart(3, "0")}`;

      console.log(athleteId);

      // ---------- Subscription plan (required) ----------
      const subscriptionPlanId = validatedData.subscriptionPlanId;
      if (!subscriptionPlanId) {
        throw new Error("Subscription plan is required.");
      }

      const plan = await ctx.subscriptionPlan.findFirst({
        where: {
          id: subscriptionPlanId,
          isActive: true,
          isArchived: false,
        },
        select: { id: true, interval: true, amount: true, name: true },
      });

      if (!plan) {
        throw new Error("Selected subscription plan is not available.");
      }

      const { interval, amount: planAmountRaw, name: planName } = plan;
      const planAmount = toDecimal(planAmountRaw);

      // ---------- Unified billing dates ----------
      const currentPeriodStart = now;
      const currentPeriodEnd = nextBillingByInterval(now, interval);

      // ---------- Create athlete ----------
      const newAthlete = await ctx.athlete.create({
        data: {
          athleteId,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          middleName: validatedData.middleName,
          email: validatedData.email || undefined,
          phoneNumber: validatedData.phoneNumber ?? "",
          dateOfBirth: validatedData.dateOfBirth,
          profilePIcture: validatedData.profilePIcture ?? "",
          positions: parseCSV(validatedData.playingPositions),
          age: calculateAge({ dob: validatedData.dateOfBirth }),
          batchesId: validatedData.batch,
          foot: validatedData.dominantFoot,
          hand: validatedData.dominantHand,
          height: validatedData.height,
          weight: validatedData.weight,
          birthCertificate: validatedData.birthCertificate || "",
          nationalIdBack: validatedData.idBack || "",
          nationalIdFront: validatedData.idFront || "",
          passportBioData: validatedData.passportCover || "",
          passportCover: validatedData.passportPage || "",

          address: {
            create: {
              country: validatedData.country,
              town: validatedData.town,
              estate: validatedData.estate,
              addressLine1: validatedData.addressLine1,
              addressLine2: validatedData.addressLine2 || "",
            },
          },

          emergencyContacts: {
            create: {
              name: validatedData.emergencyContactName,
              phoneNumber: validatedData.emergencyContactPhone,
              relationship: validatedData.emergencyContactRelationship,
            },
          },

          guardians: {
            create: {
              fullNames: validatedData.guardianFullNames,
              relationship: validatedData.guardianRelationShip,
              email: validatedData.guardianEmail,
              phoneNumber: validatedData.guardianPhoneNumber,
            },
          },

          medical: {
            create: {
              bloogGroup: validatedData.bloodGroup,
              allergies: parseCSV(validatedData.allergies),
              medicalConditions: parseCSV(validatedData.medicalConditions),
            },
          },
        },
      });

      // ---------- Subscription record ----------
      const athleteSubscription = await ctx.athleteSubscription.create({
        data: {
          athleteId: newAthlete.athleteId,
          subscriptionPlanId,
          status: "ACTIVE",
          startDate: currentPeriodStart,
          currentPeriodStart,
          currentPeriodEnd,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          trialStart: null,
          trialEnd: null,
          updatedBy: session.user.email || "system",
        },
      });

      // ---------- Initial invoice proration ----------
      const factor = proratedInitialFactor(now);
      const amountDue = planAmount.mul(factor);

      const description =
        factor === 0.5
          ? `Initial ${planName} subscription (50% proration before 15th)`
          : `Initial ${planName} subscription (full amount from 15th onwards)`;

      // For MONTHLY, currentPeriodEnd is the 30th of next month.
      // For others, it's based on interval.
      const dueDate = currentPeriodEnd;
      const nextBillingDate = currentPeriodEnd;

      // ---------- Create invoice ----------
      await ctx.invoice.create({
        data: {
          athleteId: newAthlete.athleteId,
          athleteSubscriptionId: athleteSubscription.id,
          subscriptionPlanId,
          invoiceNumber: generatedInvoiceNumber,
          type: "SUBSCRIPTION",
          description,
          unitAmount: planAmount,
          quantity: 1,
          amountDue, // ✅ prorated
          amountPaid: new Prisma.Decimal(0),
          status: "PENDING",
          dueDate,
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          isRecurring: true,
          nextBillingDate,
          issuedBy: session.user.email || "system",
        },
      });
    });

    revalidatePath("/athletes");
    revalidatePath("/finances/invoices");

    return {
      status: "SUCCESS",
      successMessage: "Athlete created successfully with subscription",
    };
  } catch (error: unknown) {
    console.error("Athlete Onboarding Error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          status: "ERROR",
          errorMessage: "A record with this information already exists.",
        };
      }
      if (error.code === "P2025") {
        return {
          status: "ERROR",
          errorMessage:
            "Required record not found. Please check subscription plans.",
        };
      }
    }

    if (error instanceof Error) {
      return { status: "ERROR", errorMessage: error.message };
    }

    return { status: "ERROR", errorMessage: "Internal server error." };
  }
};

export default AthleteOnboardingAction;
