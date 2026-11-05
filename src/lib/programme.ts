import "server-only";
import { cookies } from "next/headers";
import { getProgrammes } from "@/lib/lookups";
import { PROGRAMME_COOKIE } from "@/lib/programme-cookie";

/**
 * The programme (Boys, Girls, Elite) the header switcher is set to, or null for
 * all programmes. Kept per browser in a cookie; an archived or unknown id reads as all.
 */
export async function selectedProgrammeId(): Promise<string | null> {
  const id = (await cookies()).get(PROGRAMME_COOKIE)?.value;
  if (!id) return null;
  const programmes = await getProgrammes();
  return programmes.some((p) => p.id === id) ? id : null;
}

export { inProgramme } from "@/lib/programme-scope";
