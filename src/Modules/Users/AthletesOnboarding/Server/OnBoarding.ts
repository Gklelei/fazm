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

const AthleteOnboardingAction = async (
  data: AthleteOnBoardingType,
  // & { subscriptionPlanId?: string }, // Allow passing a specific subscription plan
): Promise<ActionPromise> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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

  const allergies = validatedData.allergies
    ? validatedData.allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
    : [];

  const medicalConditions = validatedData.medicalConditions
    ? validatedData.medicalConditions
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : [];

  const athletePositions = validatedData.playingPositions
    ? validatedData.playingPositions
        .split(",")
        .map((ap) => ap.trim())
        .filter(Boolean)
    : [];

  try {
    await db.$transaction(async (ctx) => {
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");

      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date(now.setHours(23, 59, 59, 999));

      const todaysCount = await ctx.invoice.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const invoiceSequence = (todaysCount + 1).toString().padStart(3, "0");
      const generatedInvoiceNumber = `INV-${datePart}-${invoiceSequence}`;

      const sequence = await ctx.athleteSequence.update({
        where: { id: 1 },
        data: { current: { increment: 1 } },
        select: { current: true },
      });

      const athleteId = `ATH-FFA-${String(sequence.current).padStart(3, "0")}`;

      // 1. Get or use default subscription plan
      // Todo:add payments section
      let subscriptionPlanId = "1705b571-5192-4c9e-bf4f-f79969b21a1d";

      if (!subscriptionPlanId) {
        // Find default "Monthly Training" subscription plan
        const defaultPlan = await ctx.subscriptionPlan.findFirst({
          where: {
            id: subscriptionPlanId,
            isActive: true,
            isArchived: false,
          },
        });

        if (!defaultPlan) {
          throw new Error(
            "Default subscription plan not found. Please create a 'MONTHLY_TRAINING' plan first.",
          );
        }

        subscriptionPlanId = defaultPlan.id;
      } else {
        // Verify the provided subscription plan exists and is active
        const plan = await ctx.subscriptionPlan.findUnique({
          where: {
            id: subscriptionPlanId,
            isActive: true,
            isArchived: false,
          },
        });

        if (!plan) {
          throw new Error("Selected subscription plan is not available.");
        }
      }

      // Calculate billing period based on interval
      const planDetails = await ctx.subscriptionPlan.findUnique({
        where: { id: subscriptionPlanId },
        select: { interval: true, amount: true, name: true },
      });

      if (!planDetails) {
        throw new Error("Subscription plan details not found.");
      }

      const { interval, amount: planAmount, name: planName } = planDetails;

      // Calculate next billing date based on interval
      const calculateNextBillingDate = (interval: string) => {
        const nextDate = new Date();
        switch (interval) {
          case "DAILY":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case "WEEKLY":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "MONTHLY":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "YEARLY":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
          default:
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        return nextDate;
      };

      // Calculate period start/end dates
      const currentPeriodStart = new Date();
      const currentPeriodEnd = calculateNextBillingDate(interval);

      // 2. Create the athlete
      const newAthlete = await ctx.athlete.create({
        data: {
          athleteId: athleteId,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          middleName: validatedData.middleName,
          email: validatedData.email || undefined,
          phoneNumber: validatedData.phoneNumber ?? "",
          dateOfBirth: validatedData.dateOfBirth,
          profilePIcture: validatedData.profilePIcture ?? "",
          positions: athletePositions,
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
              county: validatedData.county,
              subCounty: validatedData.subCounty,
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
              allergies,
              medicalConditions,
            },
          },
        },
        include: {
          address: true,
          emergencyContacts: true,
          guardians: true,
          medical: true,
        },
      });

      // 3. Create athlete subscription
      const athleteSubscription = await ctx.athleteSubscription.create({
        data: {
          athleteId: newAthlete.athleteId,
          subscriptionPlanId: subscriptionPlanId,
          status: "ACTIVE",
          startDate: currentPeriodStart,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          trialStart: null, // You could add trial period logic here
          trialEnd: null,
          updatedBy: session.user.email || "system",
        },
        include: {
          subscriptionPlan: true,
        },
      });

      // 4. Create initial invoice
      const invoice = await ctx.invoice.create({
        data: {
          athleteId: newAthlete.athleteId,
          athleteSubscriptionId: athleteSubscription.id,
          subscriptionPlanId: subscriptionPlanId,
          invoiceNumber: generatedInvoiceNumber,
          type: "SUBSCRIPTION",
          description: `Initial ${planName} subscription for ${interval.toLowerCase()} period`,
          unitAmount: planAmount,
          quantity: 1,
          amountDue: planAmount,
          amountPaid: 0,
          status: "PENDING",
          dueDate: calculateNextBillingDate(interval),
          periodStart: currentPeriodStart,
          periodEnd: currentPeriodEnd,
          isRecurring: true,
          nextBillingDate: calculateNextBillingDate(interval),
          issuedBy: session.user.email || "system",
        },
      });

      return {
        athlete: newAthlete,
        subscription: athleteSubscription,
        invoice: invoice,
      };
    });

    // Revalidate relevant paths
    revalidatePath("/athletes");
    revalidatePath("/finances/invoices");

    return {
      status: "SUCCESS",
      successMessage: "Athlete created successfully with subscription",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
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
      return {
        status: "ERROR",
        errorMessage: error.message,
      };
    }

    return {
      status: "ERROR",
      errorMessage: "Internal server error.",
    };
  }
};

export default AthleteOnboardingAction;
