// Test data for integration tests. Everything is fictional.
import { db } from "@/lib/prisma";
import type { ROLES } from "@/generated/prisma/enums";
import { signInAs } from "./session";

/** Empty every table (the migrations table stays). */
export async function resetDb() {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length)
    await db.$executeRawUnsafe(
      `TRUNCATE ${rows.map((r) => `"public"."${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
}

let n = 0;
const next = () => ++n;

/** A user with a role, signed in. Coaches also get a staff record. */
export async function signedIn(role: ROLES = "SUPER_ADMIN") {
  const i = next();
  const user = await db.user.create({
    data: { name: `Test ${role} ${i}`, email: `${role.toLowerCase()}${i}@example.test`, role },
  });
  const staff =
    role === "COACH"
      ? await db.staff.create({
          data: { staffId: `STF-${i}`, userId: user.id, fullNames: user.name, phoneNumber: "+254700000000" },
        })
      : null;
  signInAs({ id: user.id, name: user.name, email: user.email, role });
  return { user, staff };
}

export const makeBatch = (name = `U12 Weekend ${next()}`) => db.batches.create({ data: { name } });

export const makeLocation = () => {
  const i = next();
  return db.trainingLocations.create({ data: { name: `Pitch ${i}`, value: `pitch-${i}` } });
};

export async function makeAthlete(overrides: Partial<{ firstName: string; status: "ACTIVE" | "PENDING" | "DEACTIVATED"; batchesId: string }> = {}) {
  const i = next();
  const batchesId = overrides.batchesId ?? (await makeBatch()).id;
  return db.athlete.create({
    data: {
      athleteId: `FFA-T${String(i).padStart(4, "0")}`,
      firstName: overrides.firstName ?? `Amani${i}`,
      lastName: "Test",
      dateOfBirth: "2014-05-01",
      height: "140",
      weight: "35",
      foot: "RIGHT",
      hand: "RIGHT",
      positions: ["MIDFIELDER"],
      status: overrides.status ?? "ACTIVE",
      batchesId,
    },
  });
}

export const makePlan = (amount = 4000) =>
  db.subscriptionPlan.create({
    data: { name: `Monthly ${next()}`, code: `PLAN-${next()}`, amount, interval: "MONTHLY" },
  });

export async function makeInvoice(athleteId: string, amountDue = 4000, extra: Partial<{ type: "SUBSCRIPTION" | "MANUAL"; dueDate: Date; description: string }> = {}) {
  return db.invoice.create({
    data: {
      invoiceNumber: `INV-TEST-${String(next()).padStart(4, "0")}`,
      athleteId,
      unitAmount: amountDue,
      amountDue,
      dueDate: extra.dueDate ?? new Date(Date.now() + 7 * 86_400_000),
      type: extra.type ?? "MANUAL",
      description: extra.description ?? "October fees",
    },
  });
}
