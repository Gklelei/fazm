import { Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action";
import { BILLING_DAY, billingMonth, nextMonthlyBillingDate } from "@/lib/billing";
import { nextDocumentNumbers } from "@/lib/document-numbers";
import { formatCurrency } from "@/lib/format";
import { formatAcademy } from "@/lib/academy-time";
import { discountNewFeesInvoice, refreshInvoice } from "@/features/coupons/lib/engine";
import { invoiceBalance, payableOf } from "@/features/invoices/lib/status";
import { cancelInvoiceIn } from "@/features/invoices/lib/cancel";
import type { OldBillChoice, PlanChoice } from "../schemas/plan-change";

type Tx = Prisma.TransactionClient;
type Plan = { id: string; name: string; amount: Prisma.Decimal | number; interval: string };

const DAY = { day: "numeric", month: "short", year: "numeric" } as const;
const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * The end of a plan's first period when it starts on `now`. Monthly runs to the billing day
 * (the 30th) of next month, so a mid-month start pays a full month; others by their interval.
 */
export function nextBillingByInterval(now: Date, interval: string) {
  const next = new Date(now);
  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      return next;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      return next;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return nextMonthlyBillingDate(now, BILLING_DAY);
  }
}

/** A plan's first bill: the full plan amount, discounted like every fees invoice (siblings, coupons). */
export async function raisePlanInvoice(
  tx: Tx,
  p: { athleteId: string; subscriptionId: string; plan: Plan; start: Date; end: Date; description: string; by: string },
) {
  const [invoiceNumber] = await nextDocumentNumbers(tx, "INV", 1, p.start);
  const amount = new Prisma.Decimal(p.plan.amount);
  const invoice = await tx.invoice.create({
    data: {
      athleteId: p.athleteId,
      athleteSubscriptionId: p.subscriptionId,
      subscriptionPlanId: p.plan.id,
      invoiceNumber,
      type: "SUBSCRIPTION",
      description: p.description,
      lines: { create: { position: 0, description: p.plan.name, quantity: 1, unitAmount: amount, amount, subscriptionPlanId: p.plan.id } },
      unitAmount: amount,
      quantity: 1,
      amountDue: amount,
      amountPaid: new Prisma.Decimal(0),
      status: "PENDING",
      dueDate: p.end,
      periodStart: p.start,
      periodEnd: p.end,
      isRecurring: true,
      nextBillingDate: p.end,
      issuedBy: p.by,
    },
  });
  await discountNewFeesInvoice(tx, invoice.id);
  return invoice;
}

/** Starts a plan on `start`, running to `end`; the athlete is billed again from `end`. */
export async function startPlan(tx: Tx, p: { athleteId: string; plan: Plan; start: Date; end: Date; by: string }) {
  const subscription = await tx.athleteSubscription.create({
    data: {
      athleteId: p.athleteId,
      subscriptionPlanId: p.plan.id,
      status: "ACTIVE",
      startDate: p.start,
      currentPeriodStart: p.start,
      currentPeriodEnd: p.end,
      autoRenew: p.plan.interval !== "ONCE",
      cancelAtPeriodEnd: false,
      updatedBy: p.by,
    },
  });
  await tx.athlete.update({ where: { athleteId: p.athleteId }, data: { nextBillingDate: p.end, billingStoppedAt: null } });
  return subscription;
}

export type PlanChangeResult = {
  /** For the message and the activity log, e.g. "Girls monthly from today, billed INV-…" */
  summary: string;
  /** A new bill raised now: email it to the guardian once saved */
  invoiceNumber?: string;
  /** The old bill cancelled: log it as a cancellation too */
  cancelled?: { id: string; invoiceNumber: string };
};

/**
 * Changes an athlete's fee plan as staff chose (see schemas/plan-change.ts). The caller has
 * checked the role and that the plan fits the athlete's programme, and, for a transfer, has
 * already moved them to the new batch: a bill raised here is stamped with that programme.
 */
export async function applyPlanChange(
  tx: Tx,
  p: {
    athleteId: string;
    choice: PlanChoice;
    plan: Plan | null;
    oldBill: OldBillChoice;
    oldInvoice?: string;
    by: { id: string; email: string };
    now: Date;
  },
): Promise<PlanChangeResult> {
  const { athleteId, now } = p;
  const current = await tx.athleteSubscription.findFirst({
    where: { athleteId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { subscriptionPlanId: true, subscriptionPlan: { select: { name: true } } },
  });
  const endCurrent = () =>
    tx.athleteSubscription.updateMany({
      where: { athleteId, status: "ACTIVE" },
      data: { status: "INACTIVE", endDate: now, autoRenew: false, cancelAtPeriodEnd: true, updatedBy: p.by.id },
    });

  if (p.choice === "KEEP") {
    return { summary: current ? `kept ${current.subscriptionPlan.name}` : "no fee plan" };
  }

  if (p.choice === "STOP") {
    await endCurrent();
    await tx.athlete.update({ where: { athleteId }, data: { nextBillingDate: null, billingStoppedAt: now } });
    return { summary: current ? `stopped billing (was ${current.subscriptionPlan.name})` : "stopped billing" };
  }

  const plan = p.plan;
  if (!plan) throw new ActionError("Choose a fee plan.");

  if (p.choice === "NEXT_BILL") {
    const { end } = billingMonth(now);
    if (current?.subscriptionPlanId === plan.id) return { summary: `kept ${plan.name}` };
    await endCurrent();
    await startPlan(tx, { athleteId, plan, start: now, end, by: p.by.id });
    return { summary: `${plan.name} from the next bill on ${formatAcademy(end, DAY)}` };
  }

  // RESTART: the old bill first, as staff chose
  const old =
    p.oldBill === "KEEP"
      ? null
      : await tx.invoice.findFirst({
          where: { invoiceNumber: p.oldInvoice, athleteId, type: "SUBSCRIPTION", status: { not: "CANCELED" } },
          select: { id: true, invoiceNumber: true, amountDue: true, discount: true, amountPaid: true },
        });
  if (p.oldBill !== "KEEP" && !old) throw new ActionError("That bill can't be found on their account. Choose another.");
  // Its unused days are credited once
  if (old && p.oldBill === "CREDIT") {
    const already = await tx.invoiceDiscount.findFirst({
      where: { label: `Unused days on ${old.invoiceNumber}`, invoice: { athleteId, status: { not: "CANCELED" } } },
      select: { invoice: { select: { invoiceNumber: true } } },
    });
    if (already) throw new ActionError(`${old.invoiceNumber}'s unused days were credited on ${already.invoice.invoiceNumber}. Keep it, or choose another bill.`);
  }
  let cancelled: PlanChangeResult["cancelled"];
  if (old && p.oldBill === "CANCEL") {
    if (Number(old.amountPaid) > 0) {
      throw new ActionError(`${old.invoiceNumber} has payments, so it can't be cancelled. Keep it or credit the unused days.`);
    }
    await cancelInvoiceIn(tx, old.id, p.by.id);
    cancelled = { id: old.id, invoiceNumber: old.invoiceNumber };
  }

  await endCurrent();
  const end = nextBillingByInterval(now, plan.interval);
  const subscription = await startPlan(tx, { athleteId, plan, start: now, end, by: p.by.id });
  const invoice = await raisePlanInvoice(tx, {
    athleteId,
    subscriptionId: subscription.id,
    plan,
    start: now,
    end,
    description: `${plan.name} from ${formatAcademy(now, DAY)} (plan changed)`,
    by: p.by.email,
  });

  let credited = 0;
  if (old && p.oldBill === "CREDIT") {
    // What the old bill asked for, times the share of its billing month still to come, off the new bill
    // In whole shillings, as the dialog previews it
    const due = Math.round(payableOf(old) * billingMonth(now).unused);
    const fresh = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id }, select: { amountDue: true, discount: true, amountPaid: true } });
    credited = cents(Math.min(due, invoiceBalance(fresh)));
    if (credited > 0) {
      await tx.invoiceDiscount.create({
        data: {
          invoiceId: invoice.id,
          kind: "OTHER",
          label: `Unused days on ${old.invoiceNumber}`,
          amount: new Prisma.Decimal(credited),
          discountType: "FIXED_AMOUNT",
          value: new Prisma.Decimal(credited),
          planIds: [],
        },
      });
      await refreshInvoice(tx, invoice.id);
    }
  }

  const oldPart = cancelled
    ? `; cancelled ${cancelled.invoiceNumber}`
    : old && p.oldBill === "CREDIT"
      ? credited > 0
        ? `; credited ${formatCurrency(credited)} for unused days on ${old.invoiceNumber}`
        : `; nothing left to credit on ${old.invoiceNumber}`
      : "";
  return {
    summary: `${plan.name} from today, billed ${invoice.invoiceNumber}${oldPart}`,
    invoiceNumber: invoice.invoiceNumber,
    cancelled,
  };
}
