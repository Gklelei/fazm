import fs from "node:fs";
import path from "node:path";
import papa from "papaparse";

export function readCsv<T>(fileName: string): T[] {
  const file = path.join(__dirname, fileName);
  if (!fs.existsSync(file)) throw new Error(`CSV not found: ${file}`);

  const { data, errors } = papa.parse<T>(fs.readFileSync(file, "utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (errors.length) {
    console.warn(`⚠️  ${fileName}: ${errors.length} parse issue(s)`, errors[0]);
  }
  return data;
}

/** "", "NULL", "none" → null; otherwise trimmed. */
export function clean(v?: string | null): string | null {
  const s = (v ?? "").trim();
  return !s || /^(null|none|n\/a)$/i.test(s) ? null : s;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Parses "June 10, 2020" or US "10/24/2013" into a local calendar date.
 * Returns null when unparseable instead of inventing a date.
 */
export function parseDate(v?: string | null): Date | null {
  const s = clean(v);
  if (!s) return null;

  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mdy) {
    let year = Number(mdy[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, Number(mdy[1]) - 1, Number(mdy[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Same "YYYY-MM-DD" shape the onboarding form's <input type="date"> stores. */
export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function ageOn(dob: Date, today = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/** Kenyan numbers exported without the leading 0 ("706248295" → "0706248295"). */
export function normalizePhone(v?: string | null): string | null {
  const digits = (clean(v) ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("254") && digits.length === 12)
    return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

/** Runs `fn` over items `size` at a time; collects failures instead of aborting. */
export async function inChunks<T>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<unknown>,
  label: (item: T) => string,
) {
  const failed: { item: string; error: string }[] = [];
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.allSettled(items.slice(i, i + size).map(fn));
    results.forEach((r, j) => {
      if (r.status === "rejected") {
        failed.push({
          item: label(items[i + j]),
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    });
    process.stdout.write(
      `\r   ${Math.min(i + size, items.length)}/${items.length}`,
    );
  }
  process.stdout.write("\n");
  return failed;
}
