"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { inBackground } from "@/lib/background";
import { emailInvoice } from "@/features/invoices/lib/emails";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { academyDate, academyInstant } from "@/lib/academy-time";
import { nextDocumentNumbers } from "@/lib/document-numbers";
import { formatCurrency } from "@/lib/format";
import { invoiceStatusFor, payableOf } from "@/features/invoices/lib/status";
import { discountNewFeesInvoice, rediscount } from "@/features/coupons/lib/engine";
import {
  createInvoiceSchema,
  editInvoiceSchema,
  invoiceTotal,
  lineTotal,
  type CreateInvoiceInput,
  type EditInvoiceInput,
} from "@/features/invoices/schemas";

type Lines = ReturnType<typeof editInvoiceSchema.parse>["lines"];

/** The lines as rows, and the fields an invoice derives from them. */
function fromLines(lines: Lines) {
  const total = new Prisma.Decimal(invoiceTotal(lines));
  const rows = lines.map((l, position) => ({
    position,
    description: l.description,
    quantity: l.quantity,
    unitAmount: new Prisma.Decimal(l.unitAmount),
    amount: new Prisma.Decimal(lineTotal(l)),
    subscriptionPlanId: l.subscriptionPlanId || null,
  }));
  const plans = [...new Set(lines.map((l) => l.subscriptionPlanId).filter(Boolean))];
  return {
    rows,
    total,
    // Lists and search show this; the lines hold the detail
    description: lines.map((l) => (l.quantity > 1 ? `${l.quantity} × ${l.description}` : l.description)).join(", ").slice(0, 300),
    subscriptionPlanId: plans.length === 1 ? (plans[0] as string) : null,
  };
}

/** Due at the end of that day in Nairobi. */
const dueAt = (ymd: string) => academyInstant(ymd, "23:59");

export async function createInvoices(input: CreateInvoiceInput) {
  return asRole("finance", async (user) => {
    const v = createInvoiceSchema.parse(input);
    const ids = [...new Set(v.athletes)];
    const athletes = await db.athlete.findMany({
      where: { athleteId: { in: ids }, isArchived: false },
      select: { athleteId: true },
      orderBy: { athleteId: "asc" },
    });
    if (athletes.length !== ids.length) throw new ActionError("Some of those athletes are no longer active. Choose again.");
    const { rows, total, description, subscriptionPlanId } = fromLines(v.lines);
    const dueDate = dueAt(v.dueDate);

    const numbers = await db.$transaction(async (tx) => {
      const issued = await nextDocumentNumbers(tx, "INV", athletes.length, new Date());
      for (const [i, a] of athletes.entries()) {
        const created = await tx.invoice.create({
          data: {
            invoiceNumber: issued[i],
            athleteId: a.athleteId,
            type: v.type,
            description,
            notes: v.notes || null,
            lines: { create: rows },
            unitAmount: total,
            quantity: 1,
            amountDue: total,
            amountPaid: new Prisma.Decimal(0),
            status: invoiceStatusFor(0, Number(total), dueDate),
            dueDate,
            subscriptionPlanId,
            isRecurring: false,
            issuedBy: user.email || "system",
          },
        });
        // A fees invoice gets the sibling discount and the coupons given to the athlete
        await discountNewFeesInvoice(tx, created.id);
      }
      return issued;
    });

    revalidatePath("/invoices");
    inBackground(async () => {
      for (const n of numbers) await emailInvoice(n);
    });
    await createAuditLog({
      action: "CREATE_INVOICES",
      resource: "Invoice",
      details:
        numbers.length === 1
          ? `Created invoice ${numbers[0]} for ${athletes[0].athleteId}: ${description}, ${formatCurrency(Number(total))}`
          : `Created ${numbers.length} invoices (${numbers[0]} to ${numbers.at(-1)}): ${description}, ${formatCurrency(Number(total))} each`,
      userId: user.id,
      athleteId: numbers.length === 1 ? athletes[0].athleteId : undefined,
    });
    return {
      success: true as const,
      message: numbers.length === 1 ? `Invoice ${numbers[0]} created.` : `${numbers.length} invoices created.`,
      invoiceNumber: numbers.length === 1 ? numbers[0] : null,
    };
  });
}

export async function updateInvoice(invoiceNumber: string, input: EditInvoiceInput) {
  return asRole("finance", async (user) => {
    const v = editInvoiceSchema.parse(input);
    const { rows, total, description, subscriptionPlanId } = fromLines(v.lines);
    const dueDate = dueAt(v.dueDate);

    const { before, beforeLines } = await db.$transaction(async (tx) => {
      // Lock the invoice so a payment recorded at the same moment can't race this edit
      await tx.$queryRaw`SELECT id FROM invoices WHERE "invoiceNumber" = ${invoiceNumber} FOR UPDATE`;
      const inv = await tx.invoice.findUnique({ where: { invoiceNumber }, include: { lines: { orderBy: { position: "asc" } } } });
      if (!inv) throw new ActionError("That invoice no longer exists.");
      if (inv.status === "CANCELED") throw new ActionError("Restore the invoice before editing it.");
      // Each discount is worked out again on the new lines, from its own terms
      const re = await rediscount(tx, inv.id, rows, Number(total), Number(inv.amountPaid));
      if ("problem" in re) throw new ActionError(re.problem!);
      await re.save();
      const discount = re.discount;
      const payable = payableOf({ amountDue: total, discount });
      await tx.invoiceLine.deleteMany({ where: { invoiceId: inv.id } });
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          type: v.type,
          description,
          notes: v.notes || null,
          lines: { create: rows },
          unitAmount: total,
          quantity: 1,
          amountDue: total,
          discount: new Prisma.Decimal(discount),
          dueDate,
          status: invoiceStatusFor(Number(inv.amountPaid), payable, dueDate),
          // Keep the original plan link unless the lines now name exactly one plan
          ...(subscriptionPlanId && { subscriptionPlanId }),
        },
      });
      return { before: inv, beforeLines: inv.lines };
    });

    const summary = (ls: { description: string; quantity: number; amount: unknown }[]) =>
      ls.map((l) => `${l.quantity} × ${l.description} = ${Number(l.amount)}`);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${before.id}`);
    await createAuditLog({
      action: "UPDATE_INVOICE",
      resource: "Invoice",
      details: `Updated invoice ${invoiceNumber}`,
      userId: user.id,
      invoiceId: before.id,
      athleteId: before.athleteId,
      changes: diffFields(
        { total: Number(before.amountDue), dueDate: academyDate(before.dueDate), type: before.type, notes: before.notes ?? "", lines: summary(beforeLines) },
        { total: Number(total), dueDate: v.dueDate, type: v.type, notes: v.notes, lines: summary(rows) },
      ),
    });
    return { success: true as const, message: "Invoice updated.", invoiceNumber };
  });
}
