"use server";

import { ROLE_GROUPS } from "@/lib/roles";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";
import { athletePath } from "@/features/athletes/lib/athlete-links";

const BILLING_DAY = 30;

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function clampToDay(year: number, monthIndex0: number, day: number) {
  const dim = daysInMonth(year, monthIndex0);
  const clamped = Math.min(day, dim);
  return new Date(year, monthIndex0, clamped, 0, 0, 0, 0);
}

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

    case "ONCE":
      return null;

    default:
      return nextMonthlyBillingDate(now, BILLING_DAY);
  }
}

/** Gives a plan to an athlete without one. Changing a plan they have is changeAthletePlan. */
export const AddAthleteToSubscriptionPlan = async ({
  id,
  athleteId,
}: {
  id: string;
  athleteId: string;
}): Promise<ActionResult> => {
  const acceptedRoles = [...ROLE_GROUPS.finance] as string[];

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access, please login first",
      };
    }

    if (!acceptedRoles.includes(session.user?.role || "")) {
      return {
        success: false,
        message:
          "Unauthorized access, you dont have enough permissions to perform this role",
      };
    }

    const [plan, athlete] = await Promise.all([
      db.subscriptionPlan.findUnique({ where: { id } }),
      db.athlete.findUnique({ where: { athleteId }, include: { batches: { select: { programmeId: true } } } }),
    ]);

    if (!plan)
      return { success: false, message: "Subscription plan does not exist" };
    if (!athlete) return { success: false, message: "Athlete does not exist" };
    if (plan.programmeId && plan.programmeId !== athlete.batches?.programmeId) {
      return { success: false, message: `${plan.name} is for another programme. Choose a plan for their batch.` };
    }

    const now = new Date();
    const nextBilling = nextBillingByInterval(now, plan.interval); // Date | null

    // Duplicate protection for create: don't allow multiple ACTIVE subscriptions
    const existingActive = await db.athleteSubscription.findFirst({
      where: { athleteId: athlete.athleteId, status: "ACTIVE" },
      select: { id: true },
    });

    if (existingActive) {
      return { success: false, message: "They already have a plan. Use Change plan." };
    }

    await db.$transaction(async (tx) => {
      // Create new subscription instance
      await tx.athleteSubscription.create({
        data: {
          athleteId: athlete.athleteId, // IMPORTANT: references Athlete.athleteId
          subscriptionPlanId: plan.id,
          status: "ACTIVE",
          startDate: now,
          endDate: null,
          autoRenew: plan.interval !== "ONCE",
          cancelAtPeriodEnd: false,
          currentPeriodStart: now,
          currentPeriodEnd: nextBilling ?? now, // required field; ONCE fallback
          updatedBy: session.user.id,
        },
      });

      // Update athlete next billing date
      await tx.athlete.update({
        where: { athleteId: athlete.athleteId },
        data: {
          nextBillingDate: nextBilling,
          // Billing again
          billingStoppedAt: null,
        },
      });
    });

    revalidatePath(athletePath(athleteId));
    await createAuditLog({
      action: "ADD_SUBSCRIPTION",
      resource: "Subscription",
      details: `Put ${athlete.athleteId} on the "${plan.name}" plan`,
      userId: session.user.id,
      athleteId: athlete.id,
      recordId: plan.id,
    });

    return { success: true, message: `${plan.name} given.` };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: actionErrorMessage(error),
    };
  }
};
