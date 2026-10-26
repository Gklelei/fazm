// Applies the migrations in prisma/migrations that the database doesn't have yet, like
// `prisma migrate deploy`, for the server: the release is Next's standalone bundle, which has
// `pg` but not Prisma's CLI (whose engine is built per operating system). It writes Prisma's own
// _prisma_migrations table the same way, so `prisma migrate status` and later Prisma deploys
// agree with it. Each migration runs in one transaction: if it fails, nothing of it stays.
//
// Run from the release folder (serverdeck.json's Migrate release step): node scripts/migrate.mjs
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const DIR = "prisma/migrations";
// The lock Prisma takes, so this and a Prisma run never migrate at the same time
const LOCK = 72707369;

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL isn't set (in the project's variables).");
  process.exit(1);
}

// Prisma's ?schema= isn't a PostgreSQL option: it becomes the search path here
const url = new URL(process.env.DATABASE_URL);
const schema = url.searchParams.get("schema") || "public";
url.searchParams.delete("schema");

const local = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(DIR, d.name, "migration.sql")))
  .map((d) => d.name)
  .sort();

const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query(`SET search_path TO "${schema.replaceAll('"', '""')}"`);
  await client.query("SELECT pg_advisory_lock($1)", [LOCK]);
  await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`);
  const { rows } = await client.query(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`);

  // A migration that failed under Prisma has to be sorted out by hand first, as with Prisma
  const failed = rows.filter((r) => !r.finished_at && !r.rolled_back_at).map((r) => r.migration_name);
  if (failed.length) {
    console.error(`A migration failed before and wasn't resolved: ${failed.join(", ")}. Nothing was applied.`);
    process.exit(1);
  }
  const applied = new Map(rows.filter((r) => r.finished_at).map((r) => [r.migration_name, r.checksum]));
  for (const name of applied.keys()) if (!local.includes(name)) console.log(`The database has ${name}, which this release doesn't.`);

  const pending = [];
  for (const name of local) {
    const sql = readFileSync(join(DIR, name, "migration.sql"));
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (!applied.has(name)) pending.push({ name, sql: sql.toString("utf8"), checksum });
    else if (applied.get(name) !== checksum) console.log(`${name} was changed after it was applied (left as it is).`);
  }
  if (!pending.length) {
    console.log(`The database is up to date (${local.length} migrations).`);
  }
  for (const m of pending) {
    console.log(`Applying ${m.name}`);
    const started = new Date();
    try {
      await client.query("BEGIN");
      await client.query(m.sql);
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES ($1, $2, $3, $4, now(), 1)`,
        [randomUUID(), m.checksum, m.name, started],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`${m.name} failed and was rolled back: ${err.message}`);
      process.exit(1);
    }
  }
  if (pending.length) console.log(`Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
} finally {
  await client.end().catch(() => {});
}
