import { academyInstant, minutesBetween } from "@/lib/academy-time";

export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type Day = (typeof DAYS)[number];

/** Longest range one "Plan sessions" run may cover. */
export const MAX_PLAN_DAYS = 26 * 7;

export type Slot = {
  dayOfWeek: Day;
  time: string; // "HH:mm" academy time
  endTime: string;
  trainingLocationsId: string;
  staffId: string;
};

export type Busy = { start: Date; end: Date; staffId: string; trainingLocationsId: string; batchesId: string };

export type Planned = {
  date: Date;
  duration: number;
  trainingLocationsId: string;
  staffId: string;
  /** null when it will be created; otherwise why it's skipped */
  skip: null | "already planned" | "coach busy" | "pitch busy";
};

/** Every date from `from` to `to` (inclusive, "YYYY-MM-DD") falling on each slot's day. */
function* datesFor(from: string, to: string, day: Day) {
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const target = (DAYS.indexOf(day) + 1) % 7; // JS: Sunday = 0
  d.setUTCDate(d.getUTCDate() + ((target - d.getUTCDay() + 7) % 7));
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 7)) yield d.toISOString().slice(0, 10);
}

const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) => a.start < b.end && b.start < a.end;

/**
 * The sessions a batch's weekly timetable produces between two dates, in
 * time order. Each is either new or marked with why it's skipped: the batch
 * already trains then, or the coach or pitch is taken by another batch.
 * `busy` is every non-cancelled session overlapping the range.
 */
export function planSessions(batchId: string, slots: Slot[], from: string, to: string, busy: Busy[]): Planned[] {
  const out: Planned[] = [];
  const taken = [...busy];
  for (const slot of slots) {
    const duration = minutesBetween(slot.time, slot.endTime);
    if (duration <= 0) continue;
    for (const ymd of datesFor(from, to, slot.dayOfWeek)) {
      const start = academyInstant(ymd, slot.time);
      const span = { start, end: new Date(start.getTime() + duration * 60_000) };
      const clash = taken.filter((b) => overlaps(b, span));
      const skip = clash.some((b) => b.batchesId === batchId)
        ? "already planned"
        : clash.some((b) => b.staffId === slot.staffId)
          ? "coach busy"
          : clash.some((b) => b.trainingLocationsId === slot.trainingLocationsId)
            ? "pitch busy"
            : null;
      out.push({ date: start, duration, trainingLocationsId: slot.trainingLocationsId, staffId: slot.staffId, skip });
      // Two slots of the same run can't double-book each other either
      if (!skip) taken.push({ ...span, staffId: slot.staffId, trainingLocationsId: slot.trainingLocationsId, batchesId: batchId });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
