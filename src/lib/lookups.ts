import { unstable_cache, updateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { getCachedAcademy } from "@/lib/academy-cache";

/**
 * Settings data used across the app (locations, drills, batches, coaches,
 * attendance reasons, expense categories, fee plans). It rarely changes, so
 * each list is cached with no expiry under its own tag and only cleared by
 * `lookupsChanged(tag)` in the action that changed it.
 *
 * ponytail: unstable_cache (still supported in Next 16); move to "use cache"
 * + cacheTag when the app opts into Cache Components. Data edited straight in
 * the database stays cached until the next deploy (new .next) or a save in the app.
 */
export const LOOKUP = {
  locations: "lookup:locations",
  drills: "lookup:drills",
  batches: "lookup:batches",
  coaches: "lookup:coaches",
  attendanceReasons: "lookup:attendance-reasons",
  expenseCategories: "lookup:expense-categories",
  plans: "lookup:plans",
  academy: "academy", // shared with getCachedAcademy
} as const;

const cached = <T>(tag: string, fn: () => Promise<T>) =>
  unstable_cache(fn, [tag], { tags: [tag], revalidate: false });

const getLocations = cached(LOOKUP.locations, () =>
  db.trainingLocations.findMany(),
);
const getDrills = cached(LOOKUP.drills, () => db.drills.findMany());
const getBatches = cached(LOOKUP.batches, () => db.batches.findMany());
const getCoaches = cached(LOOKUP.coaches, () =>
  db.staff.findMany({ where: { user: { role: "COACH" } } }),
);
const getAttendanceReasons = cached(LOOKUP.attendanceReasons, () =>
  db.tRAINING_ATTENDANCE_REASONS.findMany(),
);
const getExpenseCategories = cached(LOOKUP.expenseCategories, () =>
  db.expenseCategories.findMany({
    where: { isArchived: false, status: "ACTIVE" },
    select: { name: true, id: true },
  }),
);
const getPlans = cached(LOOKUP.plans, () =>
  db.subscriptionPlan.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, amount: true, interval: true },
  }),
);

/**
 * Everything the signed-in app reads through UseUtilsContext. Returned as
 * plain JSON (dates and decimals as strings), exactly as /api/settings/utils
 * sends it, so the server-rendered first value and later refetches match.
 */
export async function getUtils(): Promise<UtilsResponse> {
  const [
    locations,
    drills,
    batches,
    coaches,
    attendance,
    expense,
    plans,
    academy,
  ] = await Promise.all([
    getLocations(),
    getDrills(),
    getBatches(),
    getCoaches(),
    getAttendanceReasons(),
    getExpenseCategories(),
    getPlans(),
    getCachedAcademy(),
  ]);
  return JSON.parse(
    JSON.stringify({
      locations,
      drills,
      batches,
      coaches,
      attendance,
      expense,
      plans,
      academy,
    }),
  );
}

/** Call from the server action that changed the data (read-your-own-writes). */
export function lookupsChanged(
  ...tags: (typeof LOOKUP)[keyof typeof LOOKUP][]
) {
  for (const tag of tags) updateTag(tag);
}
