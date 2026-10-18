"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { ActionError, asRole } from "@/lib/action";
import { createAuditLog } from "@/lib/audit";
import { formatCurrency } from "@/lib/format";
import { inBackground } from "@/lib/background";
import { PAYMENT_TYPE } from "@/features/finance/schemas";
import { applyPayment, OverpaymentError } from "@/features/finance/lib/apply-payment";
import { emailReceipt } from "@/features/invoices/lib/emails";

const familyPaymentSchema = z.object({
  athleteId: z.string().min(1),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date it was paid"),
  paymentType: z.enum(PAYMENT_TYPE),
  collectedBy: z.string().trim().min(1, "Enter who received it"),
  notes: z.string().trim().max(300).optional(),
  lines: z
    .array(z.object({ invoiceNumber: z.string().min(1), amount: z.number().positive().max(10_000_000) }))
    .min(1, "Put some of the payment on at least one invoice")
    .max(40),
});
export type FamilyPaymentInput = z.input<typeof familyPaymentSchema>;

/** One payment for a family, split across the children's invoices: one receipt per invoice, all saved together. */
export async function payFamily(input: FamilyPaymentInput) {
  return asRole("finance", async (user) => {
    const v = familyPaymentSchema.parse(input);
    const me = await db.athlete.findUnique({ where: { athleteId: v.athleteId }, select: { familyId: true } });
    if (!me?.familyId) throw new ActionError("They're not linked to a family any more. Refresh the page.");
    const invoices = await db.invoice.findMany({
      where: { invoiceNumber: { in: v.lines.map((l) => l.invoiceNumber) }, athlete: { familyId: me.familyId } },
      select: { id: true, invoiceNumber: true, athleteId: true, athlete: { select: { id: true } } },
    });
    if (invoices.length !== new Set(v.lines.map((l) => l.invoiceNumber)).size) throw new ActionError("Some of those invoices aren't this family's. Refresh the page.");
    const byNumber = new Map(invoices.map((i) => [i.invoiceNumber, i]));

    const receipts = await db
      .$transaction(async (ctx) => {
        const out: string[] = [];
        for (const l of v.lines) {
          const inv = byNumber.get(l.invoiceNumber)!;
          const { finance } = await applyPayment(ctx, {
            invoiceId: inv.id,
            athleteId: inv.athleteId,
            amount: l.amount,
            paymentDate: new Date(`${v.paymentDate}T12:00:00+03:00`),
            paymentType: v.paymentType,
            collectedBy: v.collectedBy,
            notes: v.notes ? `${v.notes} · family payment` : "Family payment",
          });
          out.push(finance.receiptNumber);
        }
        return out;
      })
      .catch((e) => {
        if (e instanceof OverpaymentError) throw new ActionError(`${e.message}. Nothing was saved.`);
        throw e;
      });

    const total = v.lines.reduce((s, l) => s + l.amount, 0);
    revalidatePath("/players/user-profile/[id]", "page");
    revalidatePath("/invoices");
    await createAuditLog({
      action: "CREATE_PAYMENT",
      resource: "Finance",
      details: `Recorded a family payment of ${formatCurrency(total)} across ${receipts.length} invoices (receipts ${receipts.join(", ")})`,
      userId: user.id,
      athleteId: invoices[0].athlete.id,
      recordId: me.familyId,
    });
    inBackground(async () => {
      for (const r of receipts) await emailReceipt(r);
    });
    return { success: true as const, message: `Payment recorded · ${receipts.length} receipts (${receipts.join(", ")})`, receipts };
  });
}
