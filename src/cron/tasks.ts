import { db } from "../lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { addDays, subDays } from "date-fns";

export async function checkExpiredSubscriptions() {
  console.log("[CRON] Checking for expired subscriptions...");
  try {
    const expired = await db.athleteSubscription.updateMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: {
          lt: new Date(),
        },
      },
      data: {
        status: "EXPIRED",
      },
    });
    console.log(`[CRON] Marked ${expired.count} subscriptions as EXPIRED.`);
  } catch (err) {
    console.error(`[CRON ERROR] checkExpiredSubscriptions failed:`, err);
  }
}

export async function checkOverdueInvoices() {
  console.log("[CRON] Checking for overdue invoices...");
  try {
    const overdue = await db.invoice.updateMany({
      where: {
        status: "PENDING",
        dueDate: {
          lt: new Date(),
        },
      },
      data: {
        status: "OVERDUE",
      },
    });
    console.log(`[CRON] Marked ${overdue.count} invoices as OVERDUE.`);
  } catch (err) {
    console.error(`[CRON ERROR] checkOverdueInvoices failed:`, err);
  }
}

export async function deactivateInactiveAthletes() {
  console.log("[CRON] Checking for inactive athletes...");
  // Rule: An athlete is inactive if their latest subscription is EXPIRED, and they have no ACTIVE subscriptions.
  try {
    // Find all active athletes
    const activeAthletes = await db.athlete.findMany({
      where: { status: "ACTIVE" },
      include: {
        athleteSubscriptions: {
          where: { status: "ACTIVE" },
        },
      },
    });

    let deactivatedCount = 0;
    for (const athlete of activeAthletes) {
      if (athlete.athleteSubscriptions.length === 0) {
        // No active subscriptions, mark deactivated
        await db.athlete.update({
          where: { id: athlete.id },
          data: { status: "DEACTIVATED" },
        });
        deactivatedCount++;
      }
    }
    console.log(`[CRON] Deactivated ${deactivatedCount} athletes.`);
  } catch (err) {
    console.error(`[CRON ERROR] deactivateInactiveAthletes failed:`, err);
  }
}

export async function notifyExpiringSubscriptions() {
  console.log("[CRON] Checking for subscriptions expiring soon...");
  try {
    const sevenDaysFromNow = addDays(new Date(), 7);
    const expiringSoon = await db.athleteSubscription.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
      },
      include: {
        athlete: true,
      },
    });

    // In a real system, you would integrate a mailer here.
    expiringSoon.forEach((sub) => {
      console.log(`[CRON - NOTIFY] Subscription for Athlete ${sub.athlete.firstName} ${sub.athlete.lastName} expires on ${sub.currentPeriodEnd}. Sending notice...`);
    });
  } catch (err) {
    console.error(`[CRON ERROR] notifyExpiringSubscriptions failed:`, err);
  }
}

export async function assignAthletesToTrainingSessions() {
  console.log("[CRON] Syncing athletes to their upcoming batch training sessions...");
  try {
    const upcomingSessions = await db.training.findMany({
      where: {
        date: { gte: new Date() },
      },
      include: {
        athletes: { select: { id: true } },
      },
    });

    let connectionsMade = 0;
    for (const session of upcomingSessions) {
      if (!session.batchesId) continue;
      
      const sessionAthleteIds = session.athletes.map((a) => a.id);
      
      const batchAthletes = await db.athlete.findMany({
        where: {
          batchesId: session.batchesId,
          isArchived: false,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      const missingConnections = batchAthletes
        .filter((ba) => !sessionAthleteIds.includes(ba.id))
        .map((ba) => ({ id: ba.id }));

      if (missingConnections.length > 0) {
        await db.training.update({
          where: { id: session.id },
          data: {
            athletes: {
              connect: missingConnections,
            },
          },
        });
        connectionsMade += missingConnections.length;
      }
    }
    console.log(`[CRON] Synchronized ${connectionsMade} new athlete-to-session connections.`);
  } catch (err) {
    console.error(`[CRON ERROR] assignAthletesToTrainingSessions failed:`, err);
  }
}
