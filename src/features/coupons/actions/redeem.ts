"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { formatCurrency } from "@/lib/format";
import { invoiceStatusFor, payableOf } from "@/features/invoices/lib/status";
import {
  checkOncePerAthlete,
  COUPON_RULES_SELECT,
  couponProblem,
  discountFor,
  giveUseBack,
  takeUse,
} from "@/features/coupons/lib/redeem";

const findCoupon = async (tx: Prisma.TransactionClient, code: string) => {
  const name = code.trim().toUpperCase();
  if (!name) throw new ActionError("Enter a coupon code.");
  const c = await tx.coupon.findUnique({ where: { name }, select: COUPON_RULES_SELECT });
  if (!c) throw new ActionError(`There's no coupon ${name}. Check the code.`);
  return c;
};

/** Locks the invoice row so a payment or edit at the same moment can't race the discount. */
async function lockInvoice(tx: Prisma.TransactionClient, invoiceNumber: string) {
  await tx.$queryRaw`SELECT id FROM invoices WHERE "invoiceNumber" = ${invoiceNumber} FOR UPDATE`;
  const inv = await tx.invoice.findUnique({ where: { invoiceNumber }, include: { lines: true, coupon: { select: { id: true, name: true, interval: true } } } });
  if (!inv) throw new ActionError("That invoice no longer exists.");
  if (inv.status === "CANCELED") throw new ActionError("Restore the invoice first.");
  return inv;
}

const invoiceTouched = (id: string, invoiceNumber: string) => {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceNumber}`);
  revalidatePath(`/invoices/${id}`);
};

/** A one-time coupon on one invoice. The discount never takes it below what's been paid. */
export async function applyCouponToInvoice(invoiceNumber: string, code: string) {
  return asRole("finance", async (user) => {
    const done = await db.$transaction(async (tx) => {
      const inv = await lockInvoice(tx, invoiceNumber);
      const c = await findCoupon(tx, code);
      if (inv.couponId === c.id) throw new ActionError(`${c.name} is already on this invoice.`);
      if (inv.couponId) throw new ActionError(`${inv.coupon?.name} is already on this invoice. Remove it first.`);
      if (c.interval === "REPEATING") throw new ActionError(`${c.name} repeats. Put it on the athlete's fee plan instead.`);
      const problem = couponProblem(c) ?? (await checkOncePerAthlete(tx, c, inv.athleteId));
      if (problem) throw new ActionError(problem);

      const total = Number(inv.amountDue);
      const amount = Math.min(discountFor(c, inv.lines), total - Number(inv.amountPaid));
      if (amount <= 0) {
        throw new ActionError(c.plans.length ? `This invoice has no ${c.plans.map((p) => p.name).join(" or ")} charges.` : "This invoice is already paid.");
      }
      // The sibling discount stays unless the coupon takes off more
      if (inv.siblingDiscount && amount <= Number(inv.discount)) {
        throw new ActionError(`The sibling discount (${formatCurrency(Number(inv.discount))}) is bigger, so it stays.`);
      }
      const used = await takeUse(tx, c);
      if (used) throw new ActionError(used);

      const discount = new Prisma.Decimal(amount);
      await tx.invoice.update({
        where: { id: inv.id },
        data: { couponId: c.id, siblingDiscount: false, discount, status: invoiceStatusFor(Number(inv.amountPaid), payableOf({ amountDue: total, discount }), inv.dueDate) },
      });
      return { inv, c, amount };
    });

    invoiceTouched(done.inv.id, invoiceNumber);
    await createAuditLog({
      action: "APPLY_INVOICE_DISCOUNT",
      resource: "Invoice",
      details: `Applied coupon ${done.c.name} to invoice ${invoiceNumber}: ${formatCurrency(done.amount)} off`,
      userId: user.id,
      invoiceId: done.inv.id,
      athleteId: done.inv.athleteId,
    });
    return { success: true as const, message: `${done.c.name} applied: ${formatCurrency(done.amount)} off.` };
  });
}

/** Takes the coupon off an invoice; a one-time coupon gets the use back. */
export async function removeCouponFromInvoice(invoiceNumber: string) {
  return asRole("finance", async (user) => {
    const done = await db.$transaction(async (tx) => {
      const inv = await lockInvoice(tx, invoiceNumber);
      if (!inv.coupon) throw new ActionError("This invoice has no coupon.");
      await tx.invoice.update({
        where: { id: inv.id },
        data: { couponId: null, discount: new Prisma.Decimal(0), status: invoiceStatusFor(Number(inv.amountPaid), Number(inv.amountDue), inv.dueDate) },
      });
      // Repeating coupons count a use when they go on the fee plan, not per invoice
      if (inv.coupon.interval === "ONCE") await giveUseBack(tx, inv.coupon.id);
      return { inv, name: inv.coupon.name };
    });

    invoiceTouched(done.inv.id, invoiceNumber);
    await createAuditLog({
      action: "REMOVE_INVOICE_DISCOUNT",
      resource: "Invoice",
      details: `Removed coupon ${done.name} from invoice ${invoiceNumber} (${formatCurrency(Number(done.inv.discount ?? 0))} discount)`,
      userId: user.id,
      invoiceId: done.inv.id,
      athleteId: done.inv.athleteId,
    });
    return { success: true as const, message: `${done.name} removed.` };
  });
}

/** A repeating coupon on an athlete's fee plan: each new fees invoice for that plan gets the discount. */
export async function applyCouponToFeePlan({ couponCode, athleteId, subId }: { couponCode: string; athleteId: string; subId: string }) {
  return asRole("finance", async (user) => {
    const c = await db.$transaction(async (tx) => {
      const sub = await tx.athleteSubscription.findUnique({ where: { id: subId }, include: { subscriptionPlan: { select: { name: true } } } });
      if (!sub || sub.athleteId !== athleteId) throw new ActionError("That fee plan no longer exists.");
      if (sub.status !== "ACTIVE") throw new ActionError("Coupons go on an active fee plan.");
      const c = await findCoupon(tx, couponCode);
      if (sub.couponId === c.id) throw new ActionError(`${c.name} is already on this fee plan.`);
      if (sub.couponId) throw new ActionError("This fee plan already has a coupon. Remove it first.");
      if (c.interval === "ONCE") throw new ActionError(`${c.name} is for one invoice. Apply it on the invoice instead.`);
      if (c.plans.length && !c.plans.some((p) => p.id === sub.subscriptionPlanId)) {
        throw new ActionError(`${c.name} is only for ${c.plans.map((p) => p.name).join(" or ")}.`);
      }
      const problem = couponProblem(c) ?? (await checkOncePerAthlete(tx, c, athleteId)) ?? (await takeUse(tx, c));
      if (problem) throw new ActionError(problem);
      await tx.athleteSubscription.update({ where: { id: subId }, data: { couponId: c.id, updatedBy: user.id } });
      return c;
    });

    revalidatePath(`/players/user-profile/${athleteId}`);
    await createAuditLog({
      action: "APPLY_COUPON",
      resource: "Subscription",
      details: `Put coupon ${c.name} on ${athleteId}'s fee plan`,
      userId: user.id,
      athleteId,
      recordId: subId,
    });
    return { success: true as const, message: `${c.name} is on the fee plan. New fees invoices get the discount.` };
  });
}

/** Takes the coupon off a fee plan and gives the use back. Invoices already discounted keep it. */
export async function removeCouponFromFeePlan({ athleteId, subId }: { athleteId: string; subId: string }) {
  return asRole("finance", async (user) => {
    const name = await db.$transaction(async (tx) => {
      const sub = await tx.athleteSubscription.findUnique({ where: { id: subId }, include: { coupon: { select: { id: true, name: true } } } });
      if (!sub || sub.athleteId !== athleteId) throw new ActionError("That fee plan no longer exists.");
      if (!sub.coupon) throw new ActionError("This fee plan has no coupon.");
      await tx.athleteSubscription.update({ where: { id: subId }, data: { couponId: null, updatedBy: user.id } });
      await giveUseBack(tx, sub.coupon.id);
      return sub.coupon.name;
    });

    revalidatePath(`/players/user-profile/${athleteId}`);
    await createAuditLog({
      action: "REMOVE_COUPON",
      resource: "Subscription",
      details: `Removed coupon ${name} from ${athleteId}'s fee plan`,
      userId: user.id,
      athleteId,
      recordId: subId,
    });
    return { success: true as const, message: `${name} removed from the fee plan.` };
  });
}
