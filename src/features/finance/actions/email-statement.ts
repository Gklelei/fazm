"use server";

import { asRole, ActionError } from "@/lib/action";
import { createAuditLog } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { formatCurrency } from "@/lib/format";
import { getCachedAcademy } from "@/lib/academy-cache";
import { guardianEmails } from "@/features/invoices/lib/emails";
import { period, statementPdf } from "@/features/finance/lib/statement-pdf";
import { athleteFileName } from "@/features/athletes/lib/athlete-links";

/** Emails an athlete's statement for a period to their guardians, PDF attached. */
export async function emailStatement(athleteId: string, from?: string, to?: string) {
  return asRole("finance", async (user) => {
    const to_ = await guardianEmails(athleteId);
    if (!to_.length) throw new ActionError("Add an email address for the guardian first, on the Guardians tab.");
    const made = await statementPdf(athleteId, period(from, to), process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
    if (!made) throw new ActionError("That athlete no longer exists. Refresh the page.");

    const academy = (await getCachedAcademy().catch(() => null))?.academyName || "Fazam Football Academy";
    const owed = made.statement.closing;
    const line = owed > 0 ? `The balance due is ${formatCurrency(owed)}.` : owed < 0 ? `The account is ${formatCurrency(-owed)} in credit.` : "Nothing is owed.";
    const res = await sendMail({
      to: to_,
      subject: `Statement for ${made.athlete.name}`,
      text: `Here is the statement for ${made.athlete.name} (${made.athlete.athleteId}). ${line} The PDF is attached.\n\n${academy}`,
      html: `<div style="font-family:sans-serif;color:#111"><p>Here is the statement for <b>${made.athlete.name}</b> (${made.athlete.athleteId}).</p><p>${line} The PDF is attached.</p><p style="color:#888;font-size:12px">${academy}</p></div>`,
      attachments: [{ filename: athleteFileName("statement", made.athlete.athleteId), content: made.pdf, contentType: "application/pdf" }],
    });
    if (!res.success) throw new ActionError("The email didn't go out. Check Settings → Emails, then try again.");

    await createAuditLog({
      action: "EMAIL_STATEMENT",
      resource: "Finance",
      details: `Emailed ${made.athlete.name}'s statement to ${to_.join(", ")}`,
      userId: user.id,
      athleteId: made.athlete.id,
    });
    return { success: true as const, message: `Statement sent to ${to_.join(", ")}.` };
  });
}
