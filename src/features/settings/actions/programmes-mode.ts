"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { isProgrammesMode, PROGRAMMES_MODES } from "@/lib/programme-mode";

/** Who sees programmes: no one, only the super admin (to try them live), or everyone. */
export async function setProgrammesMode(mode: string) {
  return asRole("developer", async (user) => {
    if (!isProgrammesMode(mode)) throw new ActionError("Pick who sees programmes.");
    const academy = await db.academy.findFirst({ select: { id: true, programmesMode: true } });
    if (!academy) throw new ActionError("Set up the academy profile first, then come back.");
    await db.academy.update({ where: { id: academy.id }, data: { programmesMode: mode } });
    const label = PROGRAMMES_MODES.find((m) => m.value === mode)!.label;
    await createAuditLog({
      action: "UPDATE_SETTINGS",
      resource: "Academy",
      details: `Programmes now shown to: ${label.toLowerCase()} (was ${academy.programmesMode})`,
      userId: user.id,
    });
    updateTag("academy");
    revalidatePath("/", "layout");
    return { success: true, message: `Programmes: ${label.toLowerCase()}.` };
  });
}
