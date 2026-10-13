import "dotenv/config";
import { db } from "@/lib/prisma";
import { seedAdmin } from "./admin";
import { seedAthletes } from "./athletes";
import {
  seedAcademy,
  seedAttendanceReasons,
  seedBatches,
} from "./reference";

/**
 * Seeds everything the app needs, in dependency order. Every step is
 * idempotent, so it is safe to re-run.
 *
 *   yarn seed                     # all steps
 *   yarn seed batches athletes    # only the named steps (still in order)
 *   yarn seed --force             # allow NODE_ENV=production
 */
const STEPS = {
  academy: seedAcademy,
  reasons: seedAttendanceReasons,
  batches: seedBatches,
  admin: seedAdmin,
  athletes: seedAthletes, // needs batches
} satisfies Record<string, () => Promise<unknown>>;

type Step = keyof typeof STEPS;

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const requested = args.filter((a) => !a.startsWith("--"));

  if (process.env.NODE_ENV === "production" && !force) {
    throw new Error("NODE_ENV=production — re-run with --force to seed anyway");
  }

  const unknown = requested.filter((s) => !(s in STEPS));
  if (unknown.length) {
    throw new Error(
      `Unknown step(s): ${unknown.join(", ")}. Available: ${Object.keys(STEPS).join(", ")}`,
    );
  }

  const host = (process.env.DATABASE_URL ?? "").split("@")[1]?.split("?")[0];
  console.log(`🌱 Seeding ${host ?? "(DATABASE_URL not set)"}`);

  const steps = (Object.keys(STEPS) as Step[]).filter(
    (s) => !requested.length || requested.includes(s),
  );

  let failures = 0;
  for (const step of steps) {
    console.log(`▶ ${step}`);
    const started = Date.now();
    const result = await STEPS[step]();
    if (typeof result === "number") failures += result;
    console.log(`  ✓ ${step} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }

  if (failures) {
    console.error(`⚠️  Finished with ${failures} failed record(s)`);
    process.exitCode = 1;
  } else {
    console.log("🏁 Seeding finished");
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
