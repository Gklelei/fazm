import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCachedAcademy } from "@/lib/academy-cache";
import { getProgrammes } from "@/lib/lookups";
import { PROGRAMME_COOKIE } from "@/lib/programme-cookie";
import { isProgrammesMode, type ProgrammesMode } from "@/lib/programme-mode";

/** Settings → Programmes: off, preview (the super admin only) or on. */
export async function programmesMode(): Promise<ProgrammesMode> {
  const mode = (await getCachedAcademy().catch(() => null))?.programmesMode;
  return isProgrammesMode(mode) ? mode : "preview";
}

/**
 * Whether the signed-in user sees programmes. When not, there's no switcher,
 * no programme fields, and every list shows everything, as before programmes.
 * Once per request.
 */
export const programmesShown = cache(async (): Promise<boolean> => {
  const mode = await programmesMode();
  if (mode !== "preview") return mode === "on";
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.role === "SUPER_ADMIN";
});

/**
 * The programme (Boys, Girls, Elite) the header switcher is set to, or null for
 * all programmes. Kept per browser in a cookie; an archived or unknown id reads as all,
 * and so does everything while programmes are hidden from this user.
 */
export async function selectedProgrammeId(): Promise<string | null> {
  const id = (await cookies()).get(PROGRAMME_COOKIE)?.value;
  if (!id || !(await programmesShown())) return null;
  const programmes = await getProgrammes();
  return programmes.some((p) => p.id === id) ? id : null;
}

export { inProgramme } from "@/lib/programme-scope";
