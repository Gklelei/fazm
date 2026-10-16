/**
 * The academy runs on Nairobi time. Kenya has no daylight saving, so it is
 * UTC+3 all year and a fixed offset is exact.
 * ponytail: fixed offset; switch to Intl time zones if the academy ever
 * operates in a zone with daylight saving.
 */
export const ACADEMY_TIME_ZONE = "Africa/Nairobi";
const OFFSET_MIN = 180;

/** "2026-11-02" + "16:00" (academy time) → the real instant. */
export function academyInstant(ymd: string, hhmm: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - OFFSET_MIN * 60_000);
}

/** Today's date in academy time, as "YYYY-MM-DD". */
export function academyToday(now = new Date()): string {
  return new Date(now.getTime() + OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** Minutes from "HH:mm" to "HH:mm"; 0 or less when the end isn't after the start. */
export function minutesBetween(start: string, end: string): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return toMin(end) - toMin(start);
}

/** Formats an instant in academy time, whatever zone the server or browser is in. */
export function formatAcademy(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: ACADEMY_TIME_ZONE, ...options }).format(new Date(date));
}

/** The academy-time date of an instant, as "YYYY-MM-DD". */
export const academyDate = (d: Date | string) =>
  formatAcademy(d, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");

/** The academy-time clock time of an instant, as "HH:mm". */
export const academyHHmm = (d: Date | string) => formatAcademy(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "Today", "Tomorrow" or "Yesterday" in academy time, or null. */
export function academyRelativeDay(d: Date | string): string | null {
  const day = academyDate(d);
  const today = academyToday();
  const shift = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  return day === today ? "Today" : day === shift(1) ? "Tomorrow" : day === shift(-1) ? "Yesterday" : null;
}
