import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every server action that writes a cached settings list must clear that
// list's cache (src/lib/lookups.ts), or the app keeps showing the old list.
const TABLE_TO_TAG: Record<string, string> = {
  trainingLocations: "LOOKUP.locations",
  drills: "LOOKUP.drills",
  batches: "LOOKUP.batches",
  staff: "LOOKUP.coaches",
  tRAINING_ATTENDANCE_REASONS: "LOOKUP.attendanceReasons",
  expenseCategories: "LOOKUP.expenseCategories",
  subscriptionPlan: "LOOKUP.plans",
  academy: 'updateTag("academy")',
};
const WRITE = /\.(\w+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") ? [p] : [];
  });

describe("settings lists stay fresh", () => {
  const sources = [...files("src/features"), ...files("src/app/(server)/api")];

  it.each(sources.flatMap((f) => {
    const src = readFileSync(f, "utf8");
    const tables = new Set([...src.matchAll(WRITE)].map((m) => m[1]).filter((t) => t in TABLE_TO_TAG));
    return [...tables].map((t) => [f, t] as const);
  }))("%s clears the cache after writing %s", (file, table) => {
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const tag = TABLE_TO_TAG[table];
    const clears = tag.startsWith("LOOKUP")
      ? new RegExp(`lookupsChanged\\([^)]*${tag.replace(".", "\\.")}\\b`).test(code)
      : code.includes(tag);
    expect(clears).toBe(true);
  });
});
