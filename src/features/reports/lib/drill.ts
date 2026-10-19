/** A chart bucket ("2026-10-05" or "2026-10") as from/to days, kept inside the report's range. */
export function bucketRange(key: string, from: string, to: string): [string, string] {
  if (key.length === 10) return [key, key];
  const [y, m] = key.split("-").map(Number);
  const start = `${key}-01`;
  const end = `${key}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  return [start < from ? from : start, end > to ? to : end];
}
