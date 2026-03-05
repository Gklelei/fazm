import cron from "node-cron";
import {
  checkExpiredSubscriptions,
  checkOverdueInvoices,
  deactivateInactiveAthletes,
  notifyExpiringSubscriptions,
  assignAthletesToTrainingSessions,
} from "./tasks";

console.log("===================================");
console.log("   CRON WORKER: INITIALIZING...   ");
console.log("===================================");

// Format: minute hour dayOfMonth month dayOfWeek
// Example: "0 0 * * *" runs every midnight.

// 1. Every midnight: Check subscriptions and invoices
cron.schedule("0 0 * * *", async () => {
  console.log("[SCHEDULER] Running daily subscription & invoice checks...");
  await checkExpiredSubscriptions();
  await checkOverdueInvoices();
  await deactivateInactiveAthletes();
});

// 2. Every week on Monday morning: Notify expiring soon
cron.schedule("0 6 * * 1", async () => {
  console.log("[SCHEDULER] Running weekly notification checks...");
  await notifyExpiringSubscriptions();
});

// 3. Every hour: Synchronize batches for newly added athletes to training sessions
cron.schedule("0 * * * *", async () => {
  console.log("[SCHEDULER] Syncing athletes to upcoming unplayed match/training sessions...");
  await assignAthletesToTrainingSessions();
});

// Run a test immediately on boot (dev-only convenience)
(async () => {
  if (process.env.NODE_ENV !== "production") {
     console.log("[DEV RUN] Running initial synchronization...");
     await checkExpiredSubscriptions();
     await checkOverdueInvoices();
     await deactivateInactiveAthletes();
     await assignAthletesToTrainingSessions();
  }
})();

console.log("===================================");
console.log("   CRON WORKER: ONLINE            ");
console.log("===================================");
