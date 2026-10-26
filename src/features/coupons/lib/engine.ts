import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { formatCurrency } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { invoiceStatusFor, payableOf } from "@/features/invoices/lib/status";
import { athleteName } from "@/features/athletes/lib/names";

/**
 * Every coupon and sibling discount goes through here, so the same athlete, coupon and invoice
 * always give the same answer, and a "no" always says why.
 *
 * - A coupon is given to an athlete (a redemption): it discounts their next fees invoices,
 *   once, N times, or always; or to one invoice.
 * - Each discount on an invoice is its own row (InvoiceDiscount) with the terms it was worked
 *   out from; the invoice's `discount` is their sum. Editing a coupon never changes an invoice;
 *   editing an invoice's lines works its discounts out again from their own terms.
 * - Uses are counted from redemptions (removed ones don't count), never from a counter.
 */

type Tx = Prisma.TransactionClient;

export const COUPON_SELECT = {
  id: true,
  name: true,
  discountType: true,
  value: true,
  duration: true,
  durationCount: true,
  startDate: true,
  expiryDate: true,
  usageLimit: true,
  oncePerAthlete: true,
  status: true,
  voided: true,
  plans: { select: { id: true, name: true } },
} satisfies Prisma.CouponSelect;

export type CouponRules = Prisma.CouponGetPayload<{ select: typeof COUPON_SELECT }>;

/** How a discount is worked out: a percentage or an amount, of the whole invoice or some fee plans' charges. */
export type Terms = { discountType: "PERCENTAGE" | "FIXED_AMOUNT"; value: number; planIds: string[] };

export type Line = { amount: unknown; subscriptionPlanId: string | null };

const cents = (n: number) => Math.round(n * 100) / 100;

export const termsOf = (c: Pick<CouponRules, "discountType" | "value" | "plans">): Terms => ({
  discountType: c.discountType,
  value: Number(c.value),
  planIds: c.plans.map((p) => p.id),
});

/** "SUMMER10 (10%)", "SUMMER10 (KSh 500)" */
export const labelOf = (c: { name: string; discountType: string; value: unknown }) =>
  `${c.name} (${c.discountType === "PERCENTAGE" ? `${Number(c.value)}%` : formatCurrency(Number(c.value))})`;

/** "one invoice", "3 fees invoices", "every fees invoice" */
export const durationText = (c: { duration: string; durationCount: number | null }) =>
  c.duration === "ONCE" ? "one invoice" : c.duration === "INVOICES" ? `${c.durationCount} fees invoice${c.durationCount === 1 ? "" : "s"}` : "every fees invoice";

/**
 * What a discount counts: the whole invoice, or only its fee plans' charges. A fees invoice
 * whose lines weren't picked from a plan counts as the plan it's for (planOfInvoice), so how a
 * line was typed never decides whether a coupon works.
 */
export function baseOf(terms: Terms, lines: Line[], planOfInvoice: string | null): number {
  const sum = (ls: Line[]) => cents(ls.reduce((s, l) => s + Number(l.amount), 0));
  if (!terms.planIds.length) return sum(lines);
  const plans = new Set(terms.planIds);
  const tagged = lines.filter((l) => l.subscriptionPlanId && plans.has(l.subscriptionPlanId));
  if (tagged.length) return sum(tagged);
  const untagged = lines.every((l) => !l.subscriptionPlanId);
  return untagged && planOfInvoice && plans.has(planOfInvoice) ? sum(lines) : 0;
}

/** The discount on those lines: never more than they come to. */
export function amountOf(terms: Terms, lines: Line[], planOfInvoice: string | null): number {
  const base = baseOf(terms, lines, planOfInvoice);
  if (base <= 0) return 0;
  return cents(terms.discountType === "PERCENTAGE" ? (base * Math.min(terms.value, 100)) / 100 : Math.min(terms.value, base));
}

/** Why the coupon can't be given right now (to anyone), or null. */
export function couponProblem(c: CouponRules, now = new Date()): string | null {
  if (c.voided === 1) return `${c.name} is archived.`;
  if (c.status !== 1) return `${c.name} is switched off.`;
  if (c.startDate > now) return `${c.name} can be used from ${c.startDate.toISOString().slice(0, 10)}.`;
  if (c.expiryDate && c.expiryDate < now) return `${c.name} could be given until ${c.expiryDate.toISOString().slice(0, 10)}.`;
  return null;
}

/** Locks the coupon's row, so two people giving its last use at the same moment can't both get it. */
async function lockCoupon(tx: Tx, code: string) {
  const name = code.trim().toUpperCase();
  if (!name) return { problem: "Enter a coupon code." as const };
  await tx.$queryRaw`SELECT id FROM coupons WHERE name = ${name} FOR UPDATE`;
  const c = await tx.coupon.findUnique({ where: { name }, select: COUPON_SELECT });
  return c ? { c } : { problem: `There's no coupon ${name}. Check the code.` };
}

/** Why this athlete can't be given the coupon now, or null: uses are counted from redemptions. */
async function redeemProblem(tx: Tx, c: CouponRules, athlete: { athleteId: string; name: string }, now = new Date()): Promise<string | null> {
  const general = couponProblem(c, now);
  if (general) return general;
  if (c.usageLimit != null) {
    const used = await tx.couponRedemption.count({ where: { couponId: c.id, status: { not: "REMOVED" } } });
    if (used >= c.usageLimit) return `${c.name} has been used ${used} of ${c.usageLimit} times.`;
  }
  if (c.oncePerAthlete) {
    const had = await tx.couponRedemption.findFirst({
      where: { couponId: c.id, athleteId: athlete.athleteId, status: { not: "REMOVED" } },
      select: { createdAt: true },
    });
    if (had) return `${c.name} is once per athlete, and ${athlete.name} had it on ${had.createdAt.toISOString().slice(0, 10)}.`;
  }
  return null;
}

async function athleteOf(tx: Tx, athleteId: string) {
  const a = await tx.athlete.findUnique({ where: { athleteId }, select: { athleteId: true, firstName: true, middleName: true, lastName: true, isArchived: true } });
  if (!a || a.isArchived) return null;
  return { athleteId: a.athleteId, name: athleteName(a) };
}

/** The athlete's active fee plan (a fees invoice without its own plan counts as it). */
async function activePlanOf(tx: Tx, athleteId: string) {
  const sub = await tx.athleteSubscription.findFirst({
    where: { athleteId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { subscriptionPlan: { select: { id: true, name: true } } },
  });
  return sub?.subscriptionPlan ?? null;
}

async function planOfInvoice(tx: Tx, inv: { subscriptionPlanId: string | null; type: string; athleteId: string }) {
  if (inv.subscriptionPlanId) return inv.subscriptionPlanId;
  return inv.type === "SUBSCRIPTION" ? ((await activePlanOf(tx, inv.athleteId))?.id ?? null) : null;
}

/** Keeps the invoice's discount total and status in step with its discount rows. */
export async function refreshInvoice(tx: Tx, invoiceId: string) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { amountDue: true, amountPaid: true, dueDate: true, status: true } });
  const sum = await tx.invoiceDiscount.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  const discount = Math.min(Number(sum._sum.amount ?? 0), Number(inv.amountDue));
  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      discount: new Prisma.Decimal(discount),
      ...(inv.status !== "CANCELED" && { status: invoiceStatusFor(Number(inv.amountPaid), payableOf({ amountDue: inv.amountDue, discount }), inv.dueDate) }),
    },
  });
}

/** What can still come off an invoice: its total, less discounts it has, less what's been paid. */
const roomOn = (inv: { amountDue: unknown; discount: unknown; amountPaid: unknown }) =>
  cents(Number(inv.amountDue) - Number(inv.discount ?? 0) - Number(inv.amountPaid));

// --- Checking (the Check buttons, and every action first) ---------------------------------------

export type Check = { ok: true; message: string; amount?: number } | { ok: false; message: string };

/** Whether a coupon can be given to an athlete (for their next fees invoices), and why not. */
export async function checkForAthlete(tx: Tx, code: string, athleteId: string, now = new Date()): Promise<Check & { coupon?: CouponRules }> {
  const athlete = await athleteOf(tx, athleteId);
  if (!athlete) return { ok: false, message: "That athlete no longer exists." };
  const found = await lockCoupon(tx, code);
  if ("problem" in found) return { ok: false, message: found.problem! };
  const c = found.c;
  const problem = await redeemProblem(tx, c, athlete, now);
  if (problem) return { ok: false, message: problem };
  const active = await tx.couponRedemption.findFirst({ where: { couponId: c.id, athleteId, invoiceId: null, status: "ACTIVE" }, select: { id: true } });
  if (active) return { ok: false, message: `${athlete.name} has ${c.name} already.` };
  if (c.plans.length) {
    const plan = await activePlanOf(tx, athleteId);
    if (!plan || !c.plans.some((p) => p.id === plan.id)) {
      return {
        ok: false,
        message: `${c.name} is only for ${c.plans.map((p) => p.name).join(" or ")}, and ${athlete.name} is ${plan ? `on ${plan.name}` : "on no fee plan"}.`,
      };
    }
  }
  return { ok: true, coupon: c, message: `${c.name} can be given to ${athlete.name}: ${labelOf(c)} off ${durationText(c)}, starting with their next fees invoice.` };
}

/** Whether a coupon can go on one invoice, how much it takes off, and why not. */
export async function checkForInvoice(tx: Tx, code: string, invoiceNumber: string, now = new Date()): Promise<Check & { coupon?: CouponRules }> {
  const inv = await tx.invoice.findUnique({ where: { invoiceNumber }, include: { lines: true, discounts: { include: { redemption: { select: { couponId: true } } } } } });
  if (!inv) return { ok: false, message: "That invoice no longer exists." };
  if (inv.status === "CANCELED") return { ok: false, message: "Restore the invoice first." };
  const found = await lockCoupon(tx, code);
  if ("problem" in found) return { ok: false, message: found.problem! };
  const c = found.c;
  if (c.duration !== "ONCE") {
    return { ok: false, message: `${c.name} lasts ${durationText(c)}: give it to the athlete instead (their profile → Coupons).` };
  }
  if (inv.discounts.some((d) => d.redemption?.couponId === c.id)) return { ok: false, message: `${c.name} is on this invoice already.` };
  const athlete = await athleteOf(tx, inv.athleteId);
  if (!athlete) return { ok: false, message: "That invoice's athlete no longer exists." };
  const problem = await redeemProblem(tx, c, athlete, now);
  if (problem) return { ok: false, message: problem };
  const full = amountOf(termsOf(c), inv.lines, await planOfInvoice(tx, inv));
  if (full <= 0) {
    return { ok: false, message: c.plans.length ? `${c.name} is only for ${c.plans.map((p) => p.name).join(" or ")}, and this invoice isn't.` : "This invoice has nothing to discount." };
  }
  const room = roomOn(inv);
  if (room <= 0) return { ok: false, message: "This invoice is paid in full (or discounted to zero) already." };
  const amount = Math.min(full, room);
  return {
    ok: true,
    coupon: c,
    amount,
    message: `${c.name} takes ${formatCurrency(amount)} off ${invoiceNumber}${amount < full ? ` (${formatCurrency(full)}, less what's been paid)` : ""}.`,
  };
}

// --- Giving, applying, removing -----------------------------------------------------------------

/** Gives a coupon to an athlete; their next fees invoices get it. Check first (checkForAthlete). */
export async function giveToAthlete(tx: Tx, c: CouponRules, athleteId: string, by: string) {
  return tx.couponRedemption.create({
    data: {
      couponId: c.id,
      athleteId,
      invoicesLeft: c.duration === "ONCE" ? 1 : c.duration === "INVOICES" ? c.durationCount : null,
      givenById: by,
    },
  });
}

/** Puts a one-time coupon on one invoice. Check first (checkForInvoice), in the same transaction. */
export async function applyToInvoice(tx: Tx, c: CouponRules, invoiceNumber: string, amount: number, by: string) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { invoiceNumber }, select: { id: true, athleteId: true } });
  const r = await tx.couponRedemption.create({
    data: { couponId: c.id, athleteId: inv.athleteId, invoiceId: inv.id, invoicesLeft: 0, status: "ENDED", endedAt: new Date(), givenById: by },
  });
  const t = termsOf(c);
  await tx.invoiceDiscount.create({
    data: { invoiceId: inv.id, kind: "COUPON", redemptionId: r.id, label: labelOf(c), amount: new Prisma.Decimal(amount), discountType: t.discountType, value: new Prisma.Decimal(t.value), planIds: t.planIds },
  });
  await refreshInvoice(tx, inv.id);
  return { invoiceId: inv.id, athleteId: inv.athleteId };
}

/**
 * Takes one discount off an invoice. A coupon given for that invoice alone stops counting as a
 * use; one given to the athlete gets that invoice back (it discounts one more later).
 */
export async function removeDiscount(tx: Tx, discountId: string, by: string) {
  const d = await tx.invoiceDiscount.findUnique({ where: { id: discountId }, include: { redemption: true, invoice: { select: { id: true, invoiceNumber: true, athleteId: true, status: true } } } });
  if (!d) return null;
  await tx.invoiceDiscount.delete({ where: { id: d.id } });
  const r = d.redemption;
  if (r?.invoiceId) {
    await tx.couponRedemption.update({ where: { id: r.id }, data: { status: "REMOVED", removedAt: new Date(), removedById: by } });
  } else if (r && r.invoicesLeft != null && r.status !== "REMOVED") {
    await tx.couponRedemption.update({ where: { id: r.id }, data: { invoicesLeft: r.invoicesLeft + 1, status: "ACTIVE", endedAt: null } });
  }
  await refreshInvoice(tx, d.invoice.id);
  return d;
}

/** Takes a coupon off an athlete: no more invoices get it; ones it discounted keep their discount. */
export async function removeFromAthlete(tx: Tx, redemptionId: string, athleteId: string, by: string) {
  const r = await tx.couponRedemption.findUnique({ where: { id: redemptionId }, include: { coupon: { select: { name: true } } } });
  if (!r || r.athleteId !== athleteId || r.invoiceId) return null;
  if (r.status !== "ACTIVE") return r;
  // Never applied: it didn't count; applied: it counts as used, and simply stops
  const applied = await tx.invoiceDiscount.count({ where: { redemptionId } });
  await tx.couponRedemption.update({
    where: { id: redemptionId },
    data: applied ? { status: "ENDED", endedAt: new Date() } : { status: "REMOVED", removedAt: new Date(), removedById: by },
  });
  return r;
}

// --- New and edited invoices ---------------------------------------------------------------------

/** The sibling discount's terms for an athlete (every child of a family but the first), or null. */
async function siblingTerms(tx: Tx, athleteId: string): Promise<Terms | null> {
  const { siblingDiscountType: discountType, siblingDiscountValue: value } = await getSettings();
  if (!discountType || !value) return null;
  const a = await tx.athlete.findUnique({ where: { athleteId }, select: { familyId: true } });
  if (!a?.familyId) return null;
  const first = await tx.athlete.findFirst({ where: { familyId: a.familyId, isArchived: false }, orderBy: [{ createdAt: "asc" }, { athleteId: "asc" }], select: { athleteId: true } });
  if (!first || first.athleteId === athleteId) return null;
  return { discountType, value, planIds: [] };
}

/**
 * Discounts a new fees invoice: the sibling discount, then each coupon given to the athlete,
 * oldest first (one switched off or archived waits), each worked out on the invoice's charges
 * and all together never more than the invoice. A coupon that lasts N invoices counts one.
 */
export async function discountNewFeesInvoice(tx: Tx, invoiceId: string, now = new Date()) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } });
  if (inv.type !== "SUBSCRIPTION") return;
  const plan = await planOfInvoice(tx, inv);
  let room = cents(Number(inv.amountDue));
  const add = async (row: { kind: "COUPON" | "SIBLING"; label: string; terms: Terms; redemptionId?: string }) => {
    const amount = Math.min(amountOf(row.terms, inv.lines, plan), room);
    if (amount <= 0) return false;
    room = cents(room - amount);
    await tx.invoiceDiscount.create({
      data: {
        invoiceId,
        kind: row.kind,
        redemptionId: row.redemptionId,
        label: row.label,
        amount: new Prisma.Decimal(amount),
        discountType: row.terms.discountType,
        value: new Prisma.Decimal(row.terms.value),
        planIds: row.terms.planIds,
      },
    });
    return true;
  };

  const sibling = await siblingTerms(tx, inv.athleteId);
  if (sibling) await add({ kind: "SIBLING", label: "Sibling discount", terms: sibling });

  const given = await tx.couponRedemption.findMany({
    where: { athleteId: inv.athleteId, invoiceId: null, status: "ACTIVE" },
    include: { coupon: { select: COUPON_SELECT } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const r of given) {
    const c = r.coupon;
    if (c.voided === 1 || c.status !== 1 || c.startDate > now) continue;
    if (r.invoicesLeft != null && r.invoicesLeft <= 0) continue;
    if (!(await add({ kind: "COUPON", label: labelOf(c), terms: termsOf(c), redemptionId: r.id }))) continue;
    if (r.invoicesLeft != null) {
      const left = r.invoicesLeft - 1;
      await tx.couponRedemption.update({ where: { id: r.id }, data: { invoicesLeft: left, ...(left === 0 && { status: "ENDED", endedAt: now }) } });
    }
  }
  await refreshInvoice(tx, invoiceId);
}

/**
 * An invoice's lines changed: each discount is worked out again from its own terms (a coupon
 * edited since doesn't count). Refused when the discounts or payments would exceed the total.
 */
export async function rediscount(tx: Tx, invoiceId: string, lines: Line[], total: number, paid: number) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { subscriptionPlanId: true, type: true, athleteId: true } });
  const plan = await planOfInvoice(tx, inv);
  const rows = await tx.invoiceDiscount.findMany({ where: { invoiceId }, orderBy: { createdAt: "asc" } });
  let sum = 0;
  const next: { id: string; amount: number }[] = [];
  for (const d of rows) {
    // Amounts carried over from before discount lines stay as they were (fixed)
    const amount = d.kind === "OTHER" ? Number(d.amount) : amountOf({ discountType: d.discountType, value: Number(d.value), planIds: d.planIds }, lines, plan);
    next.push({ id: d.id, amount });
    sum = cents(sum + amount);
  }
  if (sum > total) return { problem: `The invoice has ${formatCurrency(sum)} in discounts, so the total can't be less than that.` };
  if (paid > cents(total - sum)) return { problem: `Payments already total ${formatCurrency(paid)}, so the invoice can't be less than that.` };
  return {
    discount: sum,
    save: async () => {
      for (const n of next) await tx.invoiceDiscount.update({ where: { id: n.id }, data: { amount: new Prisma.Decimal(n.amount) } });
    },
  };
}

/**
 * A canceled invoice is as if it was never issued: its discounts come off, a coupon put on it
 * alone stops counting as a use, and a coupon given to the athlete gets the invoice back.
 */
export async function releaseDiscounts(tx: Tx, invoiceId: string, by: string) {
  const rows = await tx.invoiceDiscount.findMany({ where: { invoiceId }, select: { id: true } });
  for (const r of rows) await removeDiscount(tx, r.id, by);
  return rows.length;
}
