"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { formatCurrency } from "@/lib/format";
import { athletePath } from "@/features/athletes/lib/athlete-links";
import {
  applyToInvoice,
  checkForAthlete,
  checkForInvoice,
  durationText,
  giveToAthlete,
  labelOf,
  removeDiscount,
  removeFromAthlete,
} from "@/features/coupons/lib/engine";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Locks the invoice row so a payment or edit at the same moment can't race a discount. */
const lockInvoice = (tx: Tx, invoiceNumber: string) => tx.$queryRaw`SELECT id FROM invoices WHERE "invoiceNumber" = ${invoiceNumber} FOR UPDATE`;

const invoiceTouched = (id: string, invoiceNumber: string) => {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceNumber}`);
  revalidatePath(`/invoices/${id}`);
};

/** Check: can this coupon be given to the athlete, and what it gives (nothing is changed). */
export async function checkCouponForAthlete(athleteId: string, code: string) {
  return asRole("finance", async () => {
    const res = await db.$transaction((tx) => checkForAthlete(tx, code, athleteId));
    return { success: res.ok, message: res.message };
  });
}

/** Gives a coupon to an athlete: their next fees invoices get it (once, N times, or always). */
export async function giveCouponToAthlete(athleteId: string, code: string) {
  return asRole("finance", async (user) => {
    const c = await db.$transaction(async (tx) => {
      const check = await checkForAthlete(tx, code, athleteId);
      if (!check.ok || !check.coupon) throw new ActionError(check.message);
      await giveToAthlete(tx, check.coupon, athleteId, user.id);
      return check.coupon;
    });
    revalidatePath(athletePath(athleteId));
    revalidatePath(`/coupons/${c.id}`);
    await createAuditLog({
      action: "APPLY_COUPON",
      resource: "Coupon",
      details: `Gave coupon ${labelOf(c)} to ${athleteId}, for ${durationText(c)}`,
      userId: user.id,
      athleteId,
      recordId: c.id,
    });
    return { success: true as const, message: `${c.name} is given: ${durationText(c)}, from their next fees invoice.` };
  });
}

/** Takes a coupon off an athlete: no more invoices get it; invoices it discounted keep their discount. */
export async function removeCouponFromAthlete(athleteId: string, redemptionId: string) {
  return asRole("finance", async (user) => {
    const r = await db.$transaction((tx) => removeFromAthlete(tx, redemptionId, athleteId, user.id));
    if (!r) throw new ActionError("That coupon isn't on this athlete any more.");
    revalidatePath(athletePath(athleteId));
    revalidatePath(`/coupons/${r.couponId}`);
    await createAuditLog({
      action: "REMOVE_COUPON",
      resource: "Coupon",
      details: `Took coupon ${r.coupon.name} off ${athleteId}`,
      userId: user.id,
      athleteId,
      recordId: r.couponId,
    });
    return { success: true as const, message: `${r.coupon.name} is off. Invoices it discounted keep their discount.` };
  });
}

/** Check: can this coupon go on the invoice, and how much it takes off (nothing is changed). */
export async function checkCouponForInvoice(invoiceNumber: string, code: string) {
  return asRole("finance", async () => {
    const res = await db.$transaction((tx) => checkForInvoice(tx, code, invoiceNumber));
    return { success: res.ok, message: res.message };
  });
}

/** Puts a one-time coupon on one invoice. The discount never takes it below what's been paid. */
export async function applyCouponToInvoice(invoiceNumber: string, code: string) {
  return asRole("finance", async (user) => {
    const done = await db.$transaction(async (tx) => {
      await lockInvoice(tx, invoiceNumber);
      const check = await checkForInvoice(tx, code, invoiceNumber);
      if (!check.ok || !check.coupon || !check.amount) throw new ActionError(check.message);
      const inv = await applyToInvoice(tx, check.coupon, invoiceNumber, check.amount, user.id);
      return { ...inv, c: check.coupon, amount: check.amount };
    });
    invoiceTouched(done.invoiceId, invoiceNumber);
    revalidatePath(`/coupons/${done.c.id}`);
    await createAuditLog({
      action: "APPLY_INVOICE_DISCOUNT",
      resource: "Invoice",
      details: `Applied coupon ${labelOf(done.c)} to invoice ${invoiceNumber}: ${formatCurrency(done.amount)} off`,
      userId: user.id,
      invoiceId: done.invoiceId,
      athleteId: done.athleteId,
    });
    return { success: true as const, message: `${done.c.name} applied: ${formatCurrency(done.amount)} off.` };
  });
}

/** Takes one discount off an invoice (a coupon, or the sibling discount). */
export async function removeInvoiceDiscount(invoiceNumber: string, discountId: string) {
  return asRole("finance", async (user) => {
    const d = await db.$transaction(async (tx) => {
      await lockInvoice(tx, invoiceNumber);
      const found = await tx.invoiceDiscount.findUnique({ where: { id: discountId }, select: { invoice: { select: { invoiceNumber: true, status: true } } } });
      if (!found || found.invoice.invoiceNumber !== invoiceNumber) throw new ActionError("That discount isn't on this invoice any more.");
      if (found.invoice.status === "CANCELED") throw new ActionError("Restore the invoice first.");
      return removeDiscount(tx, discountId, user.id);
    });
    if (!d) throw new ActionError("That discount isn't on this invoice any more.");
    invoiceTouched(d.invoice.id, invoiceNumber);
    await createAuditLog({
      action: "REMOVE_INVOICE_DISCOUNT",
      resource: "Invoice",
      details: `Removed ${d.label} from invoice ${invoiceNumber} (${formatCurrency(Number(d.amount))})`,
      userId: user.id,
      invoiceId: d.invoice.id,
      athleteId: d.invoice.athleteId,
    });
    return { success: true as const, message: `${d.label} removed.` };
  });
}
