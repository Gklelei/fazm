"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { seal } from "@/lib/secret-box";
import { mailServer, sendThrough } from "@/lib/mail";
import { PREFERENCE_SCHEMAS, type PreferenceInput, type PreferenceSection } from "@/features/settings/schemas/preferences";

const LABEL: Record<PreferenceSection, string> = {
  documents: "document",
  fees: "fee",
  attendance: "attendance and session",
  emails: "email",
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

    if (section === "emails") {
      // Empty keeps the saved password; a new one is stored encrypted
      if (v.smtpPassword) v.smtpPassword = seal(v.smtpPassword as string);
      else delete v.smtpPassword;
      if (!v.smtpHost) v.smtpPassword = null;
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
      changes: diffFields(before, v, ["smtpPassword"]),
    });
    return { success: true as const, message: "Settings saved." };
  });
}

/** Sends a test email to you through the saved mail server. */
export async function sendTestEmail() {
  return asRole("admin", async (user) => {
    const server = await mailServer();
    if (!server) throw new ActionError("Enter the mail server and sender address, save, then try again.");
    try {
      await sendThrough(server, {
        to: [user.email],
        subject: "Test email from Fazam",
        text: "Emails from the academy system will arrive like this one.",
        html: "<p style=\"font-family:sans-serif\">Emails from the academy system will arrive like this one.</p>",
      });
    } catch (e) {
      const why = e instanceof Error ? e.message : "";
      throw new ActionError(
        /auth|535|534|login/i.test(why)
          ? "The mail server refused the username or password. Check them and save again."
          : /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout|ESOCKET|ECONNECTION/i.test(why)
            ? "Couldn't reach the mail server. Check the server name, port and security setting."
            : "The mail server didn't accept the email. Check the settings and try again.",
      );
    }
    await createAuditLog({ action: "TEST_EMAIL", resource: "Academy", details: `Sent a test email to ${user.email}`, userId: user.id });
    return { success: true as const, message: `Test email sent to ${user.email}.` };
  });
}
