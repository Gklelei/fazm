import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const CRON_SECRET = process.env.CRON_SECRET;
const BILLING_DAY = 30;

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

function invoiceDatePart(now: Date) {
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function clampToDay(year: number, monthIndex0: number, day: number) {
  const dim = daysInMonth(year, monthIndex0);
  return new Date(year, monthIndex0, Math.min(day, dim), 0, 0, 0, 0);
}

/** 30th of next month (clamped) */
function nextMonthlyBillingDate(from: Date) {
  const nextMonthFirst = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return clampToDay(
    nextMonthFirst.getFullYear(),
    nextMonthFirst.getMonth(),
    BILLING_DAY,
  );
}

/** Generic next billing (MONTHLY uses your unified 30th rule) */
function nextBillingByInterval(from: Date, interval: string) {
  const next = new Date(from);

  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;

    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;

    case "MONTHLY":
      return nextMonthlyBillingDate(from);

    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      return next;

    // ONCE should never be auto-invoiced again
    default:
      return null;
  }
}

/**
 * Billing cycle key for idempotency.
 * Needs to differ by interval.
 */
function billingCycleKey(periodEnd: Date, interval: string) {
  const y = periodEnd.getFullYear();
  const m = String(periodEnd.getMonth() + 1).padStart(2, "0");
  const d = String(periodEnd.getDate()).padStart(2, "0");

  switch (interval) {
    case "DAILY":
      return `${y}-${m}-${d}`; // day-based
    case "WEEKLY":
      // ISO-week-ish key: use YYYY-MM-DD of periodEnd as weekly boundary
      return `W-${y}-${m}-${d}`;
    case "MONTHLY":
      return `${y}-${m}`; // month-based
    case "YEARLY":
      return `${y}`; // year-based
    default:
      return `${y}-${m}-${d}`;
  }
}

function moneyDecimal(n: number) {
  return new Prisma.Decimal(n).toDecimalPlaces(2);
}

export async function POST() {
  // ---- auth guard ----
  const h = await headers();
  const authHeader = h.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const datePart = invoiceDatePart(now);

  const summary = await db.$transaction(async (ctx) => {
    /**
     * Bill anything due today OR overdue.
     * If you only bill "today", missing a cron run will skip billing.
     */
    const dueSubs = await ctx.athleteSubscription.findMany({
      where: {
        status: "ACTIVE",
        autoRenew: true,
        cancelAtPeriodEnd: false,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
        subscriptionPlan: {
          isActive: true,
          isArchived: false,
          // exclude ONCE from auto invoicing
          interval: { in: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] },
        },
        currentPeriodEnd: {
          lte: todayEnd, // ✅ overdue included
        },
      },
      select: {
        id: true,
        athleteId: true,
        subscriptionPlanId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        subscriptionPlan: {
          select: { name: true, amount: true, interval: true },
        },
      },
      take: 5000,
    });

    if (dueSubs.length === 0) {
      return { created: 0, skippedExisting: 0, totalCandidates: 0 };
    }

    // daily invoice number sequence
    const todaysCount = await ctx.invoice.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    });
    let seq = todaysCount + 1;

    let created = 0;
    let skippedExisting = 0;

    for (const sub of dueSubs) {
      const interval = String(sub.subscriptionPlan.interval);
      const cycle = billingCycleKey(sub.currentPeriodEnd, interval);

      // Idempotency: subscription+cycle+type
      const existing = await ctx.invoice.findFirst({
        where: {
          athleteSubscriptionId: sub.id,
          billingCycle: cycle,
          type: "SUBSCRIPTION",
        },
        select: { id: true },
      });

      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const nextEnd = nextBillingByInterval(sub.currentPeriodEnd, interval);
      if (!nextEnd) {
        // should not happen because we filtered intervals, but keep safe
        skippedExisting += 1;
        continue;
      }

      const invoiceNumber = `INV-${datePart}-${String(seq).padStart(3, "0")}`;
      seq += 1;

      const unitAmount = moneyDecimal(sub.subscriptionPlan.amount);
      const amountDue = unitAmount;

      await ctx.invoice.create({
        data: {
          invoiceNumber,
          athleteId: sub.athleteId,
          subscriptionPlanId: sub.subscriptionPlanId,
          athleteSubscriptionId: sub.id,
          type: "SUBSCRIPTION",
          description: `${interval} subscription invoice: ${sub.subscriptionPlan.name}`,

          unitAmount,
          quantity: 1,
          amountDue,
          amountPaid: new Prisma.Decimal(0),
          status: "PENDING",

          dueDate: sub.currentPeriodEnd,
          isRecurring: true,
          billingCycle: cycle,
          periodStart: sub.currentPeriodStart,
          periodEnd: sub.currentPeriodEnd,
          nextBillingDate: nextEnd,

          issuedBy: "system-cron",
        },
      });

      // Advance subscription window
      await ctx.athleteSubscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: sub.currentPeriodEnd,
          currentPeriodEnd: nextEnd,
          updatedBy: "system-cron",
        },
      });

      created += 1;
    }

    return { created, skippedExisting, totalCandidates: dueSubs.length };
  });

  return NextResponse.json({
    ok: true,
    runAt: now.toISOString(),
    ...summary,
  });
}
