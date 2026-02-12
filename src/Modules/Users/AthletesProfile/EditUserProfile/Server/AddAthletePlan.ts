"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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

export const AddAthleteToSubscriptionPlan = async ({
  id,
  mode,
  athleteId,
}: {
  id: string;
  mode: "edit" | "create";
  athleteId: string;
}): Promise<ActionResult> => {
  const acceptedRoles = ["ADMIN", "SUPER_ADMIN"];

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
      db.athlete.findUnique({ where: { athleteId } }),
    ]);

    if (!plan)
      return { success: false, message: "Subscription plan does not exist" };
    if (!athlete) return { success: false, message: "Athlete does not exist" };

    const now = new Date();
    const nextBilling = nextBillingByInterval(now, plan.interval); // Date | null

    // Duplicate protection for create: don't allow multiple ACTIVE subscriptions
    const existingActive = await db.athleteSubscription.findFirst({
      where: { athleteId: athlete.athleteId, status: "ACTIVE" },
      select: { id: true },
    });

    if (mode === "create" && existingActive) {
      return {
        success: false,
        message:
          "Athlete already has an active subscription. Use edit to change the plan.",
      };
    }

    await db.$transaction(async (tx) => {
      if (mode === "edit") {
        // End any current active subscriptions (enforce only one active at a time)
        await tx.athleteSubscription.updateMany({
          where: { athleteId: athlete.athleteId, status: "ACTIVE" },
          data: {
            status: "INACTIVE",
            endDate: now,
            autoRenew: false,
            cancelAtPeriodEnd: true,
            updatedBy: session.user.id,
          },
        });
      }

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
        },
      });
    });

    revalidatePath(`/users/players/user-profile/${athleteId}`);

    return {
      success: true,
      message:
        mode === "create"
          ? "Athlete added to a subscription plan"
          : "Athlete subscription plan updated",
    };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
