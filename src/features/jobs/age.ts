/**
 * Age in whole years from a stored date of birth. Accepts the formats found
 * in the data: YYYY-MM-DD (the form's format), ISO timestamps, and
 * DD/MM/YYYY or DD-MM-YYYY. Returns null when it can't be read or is absurd.
 */
export function ageFromDob(raw: string | null | undefined, today = new Date()): number | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  let y: number, m: number, d: number;
  const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ymd) [y, m, d] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else {
    const t = new Date(s);
    if (Number.isNaN(t.getTime())) return null;
    [y, m, d] = [t.getFullYear(), t.getMonth() + 1, t.getDate()];
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  let age = today.getFullYear() - y;
  const before =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (before) age -= 1;
  return age >= 0 && age <= 100 ? age : null;
}
