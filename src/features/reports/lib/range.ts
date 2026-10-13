import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";

export const PRESETS = {
  month: "This month",
  "last-month": "Last month",
  quarter: "This quarter",
  year: "This year",
  "12m": "Last 12 months",
} as const;

export type Preset = keyof typeof PRESETS;

export type ReportRange = {
  from: Date;
  to: Date;
  /** The same number of days immediately before, for comparison */
  prevFrom: Date;
  prevTo: Date;
  preset: Preset | null;
  label: string;
  /** Daily points for short ranges, monthly otherwise */
  bucket: "day" | "month";
};

const ymd = (s: string | undefined) => {
  const d = s ? parse(s, "yyyy-MM-dd", new Date()) : null;
  // Half-typed years (0002, 0202) arrive as valid dates; ignore them
  return d && isValid(d) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100 ? d : null;
};

function presetRange(p: Preset, now: Date): [Date, Date] {
  switch (p) {
    case "last-month": {
      const start = startOfMonth(subMonths(now, 1));
      return [start, subDays(startOfMonth(now), 1)];
    }
    case "quarter":
      return [startOfQuarter(now), now];
    case "year":
      return [startOfYear(now), now];
    case "12m":
      return [startOfMonth(subMonths(now, 11)), now];
    default:
      return [startOfMonth(now), now];
  }
}

/** Reads ?range=<preset> or ?from=YYYY-MM-DD&to=YYYY-MM-DD; defaults to this month. */
export function parseRange(sp: Record<string, string | undefined>, now = new Date()): ReportRange {
  let from = ymd(sp.from);
  let to = ymd(sp.to);
  let preset: Preset | null = null;

  if (!from && !to) {
    preset = sp.range && sp.range in PRESETS ? (sp.range as Preset) : "month";
    [from, to] = presetRange(preset, now);
  }
  from = startOfDay(from ?? to!);
  to = endOfDay(to ?? now);
  if (to < from) [from, to] = [startOfDay(to), endOfDay(from)];

  const days = differenceInCalendarDays(to, from) + 1;
  const prevTo = endOfDay(subDays(from, 1));
  const prevFrom = startOfDay(subDays(from, days));
  const sameYear = from.getFullYear() === to.getFullYear();

  return {
    from,
    to,
    prevFrom,
    prevTo,
    preset,
    label: preset
      ? PRESETS[preset]
      : `${format(from, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`,
    bucket: days <= 62 ? "day" : "month",
  };
}

/** Every bucket in the range, so empty days/months still show on the chart. */
export function bucketKeys(r: ReportRange) {
  const keys: { key: string; label: string }[] = [];
  if (r.bucket === "day") {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) {
      keys.push({ key: format(d, "yyyy-MM-dd"), label: format(d, "d MMM") });
    }
  } else {
    for (let d = startOfMonth(r.from); d <= r.to; d = startOfMonth(addDays(d, 32))) {
      keys.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM yy") });
    }
  }
  return keys;
}

export const bucketOf = (d: Date, r: ReportRange) => format(d, r.bucket === "day" ? "yyyy-MM-dd" : "yyyy-MM");
