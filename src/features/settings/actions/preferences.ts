"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { PREFERENCE_SCHEMAS, type PreferenceInput, type PreferenceSection } from "@/features/settings/schemas/preferences";

const LABEL: Record<PreferenceSection, string> = {
  documents: "document",
  fees: "fee",
  attendance: "attendance and session",
  registration: "registration",
};

/** Saves one Settings section. Only that section's fields change. */
export async function saveSettings<S extends PreferenceSection>(section: S, input: PreferenceInput<S>) {
  return asRole("admin", async (user) => {
    const v = PREFERENCE_SCHEMAS[section].parse(input) as Record<string, unknown>;
    const academy = await db.academy.findFirst();
    if (!academy) throw new ActionError("Set up the academy profile first, then come back.");
    if (section === "fees" && v.defaultPlanId && !(await db.subscriptionPlan.findUnique({ where: { id: v.defaultPlanId as string }, select: { id: true } }))) {
      throw new ActionError("That fee plan no longer exists. Choose again.");
    }

    await db.academy.update({ where: { id: academy.id }, data: v });
    updateTag("academy");
    revalidatePath("/settings");

    const before = Object.fromEntries(Object.keys(v).map((k) => [k, academy[k as keyof typeof academy]]));
    await createAuditLog({
      action: "UPDATE_SETTINGS",
      resource: "Academy",
      details: `Changed the ${LABEL[section]} settings`,
      userId: user.id,
      academyId: academy.id,
      changes: diffFields(before, v),
    });
    return { success: true as const, message: "Settings saved." };
  });
}
