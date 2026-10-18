import "server-only";
import { subDays } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { nextDocumentNumbers } from "@/lib/document-numbers";
import { emailInvoice } from "@/features/invoices/lib/emails";

/**
 * Job: one late-fee invoice per overdue invoice, once it's been overdue past
 * the grace days in Settings → Fees. Off while no late fee amount is set.
 * Late fees never get late fees of their own.
 */
export async function lateFees({ now = new Date(), dryRun = false } = {}) {
  const s = await getSettings();
  if (!s.lateFeeAmount) return { charged: 0, reason: "No late fee is set" };
  const due = await db.invoice.findMany({
    where: { status: "OVERDUE", type: { not: "LATE_FEE" }, dueDate: { lt: subDays(now, s.lateFeeGraceDays) }, lateFee: null },
    select: { id: true, invoiceNumber: true, athleteId: true },
    orderBy: { dueDate: "asc" },
    take: 200,
  });
  if (dryRun) return { charged: 0, wouldCharge: due.length, dryRun: true };

  const amount = new Prisma.Decimal(s.lateFeeAmount);
  const created: string[] = [];
  for (const inv of due) {
    const description = `Late fee for ${inv.invoiceNumber}`;
    const number = await db
      .$transaction(async (tx) => {
        const [n] = await nextDocumentNumbers(tx, "INV", 1, now);
        await tx.invoice.create({
          data: {
            invoiceNumber: n,
            athleteId: inv.athleteId,
            type: "LATE_FEE",
            description,
            lines: { create: { position: 0, description, quantity: 1, unitAmount: amount, amount } },
            unitAmount: amount,
            quantity: 1,
            amountDue: amount,
            amountPaid: new Prisma.Decimal(0),
            status: "PENDING",
            dueDate: new Date(now.getTime() + s.invoiceDueDays * 86_400_000),
            isRecurring: false,
            issuedBy: "system",
            lateFeeForId: inv.id,
          },
        });
        return n;
      })
      // Another run charged it first (one late fee per invoice is enforced by the database)
      .catch((e) => (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" ? null : Promise.reject(e)));
    if (number) created.push(number);
  }
  for (const n of created) await emailInvoice(n).catch((e) => console.error("Late fee email failed", e));
  return { charged: created.length, invoices: created };
}
