import { unstable_cache } from "next/cache";
import { db } from "./prisma";

/**
 * The academy settings row rarely changes (branding, contact info) but was
 * being re-queried on every request across several call sites (the academy
 * settings page, the public settings-utils API, the invoice PDF route).
 * Cached under one tag so any edit can invalidate all of them at once via
 * revalidateTag("academy") — see CreateAcademyUtils/EditAcademyUtils.
 */
export const getCachedAcademy = unstable_cache(
  () => db.academy.findFirst(),
  ["academy-settings"],
  { tags: ["academy"] },
);
