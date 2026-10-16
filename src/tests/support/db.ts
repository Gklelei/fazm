// Test data for integration tests. Everything is fictional.
import { db } from "@/lib/prisma";
import type { ROLES } from "@/generated/prisma/enums";
import { signInAs } from "./session";

let deleteOrder: string[] | null = null;

/**
 * Tables in an order safe to empty with DELETE: a table comes before any
 * table it references. (TRUNCATE was used before, but it syncs every table's
 * files to disk and sometimes took tens of seconds on a slow disk, timing out
 * the next test's setup.)
 */
async function tablesToEmpty() {
  if (deleteOrder) return deleteOrder;
  const tables = (
    await db.$queryRaw<{ t: string }[]>`
      SELECT tablename AS t FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  ).map((r) => r.t);
  const refs = await db.$queryRaw<{ child: string; parent: string }[]>`
    SELECT c.relname AS child, p.relname AS parent
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN pg_class p ON p.oid = k.confrelid
    WHERE k.contype = 'f' AND k.connamespace = 'public'::regnamespace AND k.conrelid <> k.confrelid`;
  const order: string[] = [];
  const left = new Set(tables);
  while (left.size) {
    // Tables nothing remaining points at can go now
    const ready = [...left].filter((t) => !refs.some((r) => r.parent === t && r.child !== t && left.has(r.child)));
    if (!ready.length) throw new Error(`Can't order tables for reset: ${[...left].join(", ")}`);
    for (const t of ready) {
      order.push(t);
      left.delete(t);
    }
  }
  return (deleteOrder = order);
}

/** Empty every table (the migrations table stays). */
export async function resetDb() {
  const order = await tablesToEmpty();
  await db.$transaction(order.map((t) => db.$executeRawUnsafe(`DELETE FROM "public"."${t}"`)));
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
