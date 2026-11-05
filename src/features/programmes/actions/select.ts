"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getProgrammes } from "@/lib/lookups";
import { PROGRAMME_COOKIE } from "@/lib/programme-cookie";
import { programmesShown } from "@/lib/programme";

/** Sets the header switcher: a programme id, or "" for all programmes. The page refreshes with it. */
export async function selectProgramme(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;
  const jar = await cookies();
  if (!id || !(await programmesShown()) || !(await getProgrammes()).some((p) => p.id === id)) {
    jar.delete(PROGRAMME_COOKIE);
    return;
  }
  jar.set(PROGRAMME_COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
}
