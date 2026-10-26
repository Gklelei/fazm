import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { makeAthlete, makeInvoice, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { createCoupon, setCouponActive, updateCoupon } from "@/features/coupons/actions/coupons";
import {
  applyCouponToInvoice,
  checkCouponForAthlete,
  checkCouponForInvoice,
  giveCouponToAthlete,
  removeCouponFromAthlete,
  removeInvoiceDiscount,
} from "@/features/coupons/actions/redeem";
import { createInvoices, updateInvoice } from "@/features/invoices/actions/save-invoice";
import { setInvoiceCancelled } from "@/features/invoices/actions/cancel-invoice";
import type { CouponInput } from "@/features/coupons/schemas";

const coupon = (over: Partial<CouponInput> = {}): CouponInput => ({
  name: "SAVE10",
  discountType: "PERCENTAGE",
  value: 10,
  duration: "ONCE",
  durationCount: "",
  startDate: "2026-01-01",
  expiryDate: "",
  usageLimit: "",
  oncePerAthlete: false,
  plans: [],
  ...over,
});

const make = async (over: Partial<CouponInput> = {}) => {
  const res = await createCoupon(coupon(over));
  if (!res.success || !("id" in res)) throw new Error(res.message);
  return res.id;
};

const invoiceOf = (n: string) => db.invoice.findUniqueOrThrow({ where: { invoiceNumber: n }, include: { discounts: { orderBy: { createdAt: "asc" } } } });
/** Uses are the redemptions that weren't removed */
const uses = (couponId: string) => db.couponRedemption.count({ where: { couponId, status: { not: "REMOVED" } } });

async function subscribed(planAmount = 3000) {
  const athlete = await makeAthlete();
  const plan = await makePlan(planAmount);
  const now = new Date();
  await db.athleteSubscription.create({
    data: { athleteId: athlete.athleteId, subscriptionPlanId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000) },
  });
  return { athleteId: athlete.athleteId, plan };
}

/** A fees invoice for the athlete, its line typed by hand or picked from the plan */
async function bill(athleteId: string, amount = 3000, { type = "SUBSCRIPTION" as "SUBSCRIPTION" | "ITEM_PURCHASE", planId = undefined as string | undefined } = {}) {
  const res = await createInvoices({
    athletes: [athleteId],
    type,
    lines: [{ description: "Fees", quantity: 1, unitAmount: amount, ...(planId && { subscriptionPlanId: planId }) }],
    dueDate: "2099-01-31",
    notes: "",
  });
  if (!res.success || !("invoiceNumber" in res) || !res.invoiceNumber) throw new Error(res.message);
  return invoiceOf(res.invoiceNumber);
}

describe("coupons", () => {
  beforeEach(resetDb);

  it("are created, edited and switched on and off by finance only", async () => {
    await signedIn("FINANCE");
    const id = await make({ name: "save10" });
    expect((await db.coupon.findUniqueOrThrow({ where: { id } })).name).toBe("SAVE10");
    expect((await createCoupon(coupon())).message).toBe("SAVE10 already exists. Choose another code.");
    expect((await createCoupon(coupon({ name: "BIG", value: 150 }))).message).toBe("Up to 100%");
    expect((await createCoupon(coupon({ name: "SOME", duration: "INVOICES" }))).message).toBe("How many fees invoices?");
    expect((await setCouponActive(id, false)).success).toBe(true);
    expect((await updateCoupon(id, coupon({ value: 15 }))).success).toBe(true);
    await signedIn("COACH");
    expect((await createCoupon(coupon({ name: "NOPE" }))).success).toBe(false);
  });

  it("a one-time coupon discounts an invoice as its own line, keeps its notes, and comes off again", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 4000);
    await db.invoice.update({ where: { id: inv.id }, data: { notes: "Paid by uncle" } });
    const id = await make({ usageLimit: "5" });

    // Check says what it would do, and changes nothing
    expect(await checkCouponForInvoice(inv.invoiceNumber, "save10")).toEqual({ success: true, message: `SAVE10 takes ${formatCurrency(400)} off ${inv.invoiceNumber}.` });
    expect(await uses(id)).toBe(0);

    expect((await applyCouponToInvoice(inv.invoiceNumber, "save10")).success).toBe(true);
    let after = await invoiceOf(inv.invoiceNumber);
    expect([Number(after.discount), after.notes, after.discounts.map((d) => [d.label, Number(d.amount)])]).toEqual([400, "Paid by uncle", [["SAVE10 (10%)", 400]]]);
    expect(await uses(id)).toBe(1);
    expect((await applyCouponToInvoice(inv.invoiceNumber, "SAVE10")).message).toBe("SAVE10 is on this invoice already.");

    expect((await removeInvoiceDiscount(inv.invoiceNumber, after.discounts[0].id)).success).toBe(true);
    after = await invoiceOf(inv.invoiceNumber);
    expect([Number(after.discount), after.discounts.length]).toEqual([0, 0]);
    expect(await uses(id)).toBe(0);
  });

  it("marks an invoice paid when the discount covers what's left, never more", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 1000);
    await db.invoice.update({ where: { id: inv.id }, data: { amountPaid: 900, status: "PARTIAL" } });
    await make({ discountType: "FIXED_AMOUNT", value: 500 });
    await applyCouponToInvoice(inv.invoiceNumber, "SAVE10");
    const after = await invoiceOf(inv.invoiceNumber);
    expect([Number(after.discount), after.status]).toEqual([100, "PAID"]);
  });

  // Was: a plan-limited coupon found no charges when the line was typed rather than picked from the plan
  it("judges a fees invoice by the athlete's fee plan, not by how its line was typed", async () => {
    await signedIn("FINANCE");
    const s = await subscribed(3000);
    const other = await makePlan(5000);
    await make({ name: "PLANONLY", plans: [s.plan.id] });

    const typed = await bill(s.athleteId, 3000);
    const picked = await bill(s.athleteId, 3000, { planId: s.plan.id });
    expect((await applyCouponToInvoice(typed.invoiceNumber, "PLANONLY")).success).toBe(true);
    expect((await applyCouponToInvoice(picked.invoiceNumber, "PLANONLY")).success).toBe(true);
    expect([Number((await invoiceOf(typed.invoiceNumber)).discount), Number((await invoiceOf(picked.invoiceNumber)).discount)]).toEqual([300, 300]);

    // Charges for another plan, or an invoice that isn't fees, aren't its
    const elsewhere = await bill(s.athleteId, 5000, { planId: other.id });
    const kit = await makeInvoice(s.athleteId, 800, { type: "MANUAL" });
    const message = `PLANONLY is only for ${s.plan.name}, and this invoice isn't.`;
    expect((await applyCouponToInvoice(elsewhere.invoiceNumber, "PLANONLY")).message).toBe(message);
    expect((await applyCouponToInvoice(kit.invoiceNumber, "PLANONLY")).message).toBe(message);
  });

  // Was: a canceled invoice still counted, so a "once per athlete" coupon was refused for that athlete for good
  it("once per athlete, released when its invoice is canceled", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const [one, two] = await Promise.all([makeInvoice(a.athleteId, 1000), makeInvoice(a.athleteId, 1000)]);
    const id = await make({ name: "WELCOME", oncePerAthlete: true });
    await applyCouponToInvoice(one.invoiceNumber, "WELCOME");
    expect((await applyCouponToInvoice(two.invoiceNumber, "WELCOME")).message).toMatch(/^WELCOME is once per athlete, and .+ had it on \d{4}-\d{2}-\d{2}\.$/);

    expect((await setInvoiceCancelled(one.invoiceNumber, true)).success).toBe(true);
    expect(await uses(id)).toBe(0);
    expect((await applyCouponToInvoice(two.invoiceNumber, "WELCOME")).success).toBe(true);
  });

  // Was: a counter that went up and down drifted from what really happened
  it("counts uses from what was given, never past its limit even at the same moment", async () => {
    await signedIn("FINANCE");
    const id = await make({ name: "ONEOFF", usageLimit: "1" });
    const others = await Promise.all([makeAthlete(), makeAthlete()]);
    const invs = await Promise.all(others.map((o) => makeInvoice(o.athleteId, 1000)));
    const results = await Promise.all(invs.map((i) => applyCouponToInvoice(i.invoiceNumber, "ONEOFF")));
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.find((r) => !r.success)?.message).toBe("ONEOFF has been used 1 of 1 times.");
    expect(await uses(id)).toBe(1);
  });

  it("given to an athlete for always: each new fees invoice, not other invoices, until it's taken off", async () => {
    await signedIn("FINANCE");
    const s = await subscribed(3000);
    const id = await make({ name: "STAFFKID", duration: "ALWAYS", value: 50 });

    expect((await checkCouponForAthlete(s.athleteId, "STAFFKID")).success).toBe(true);
    expect((await giveCouponToAthlete(s.athleteId, "STAFFKID")).success).toBe(true);
    expect((await giveCouponToAthlete(s.athleteId, "STAFFKID")).message).toMatch(/has STAFFKID already\.$/);
    expect(await uses(id)).toBe(1);

    const first = await bill(s.athleteId);
    const second = await bill(s.athleteId);
    const kit = await bill(s.athleteId, 3000, { type: "ITEM_PURCHASE" });
    expect([first, second, kit].map((i) => Number(i.discount ?? 0))).toEqual([1500, 1500, 0]);
    expect(await uses(id)).toBe(1);

    // Editing the lines works the discount out again from its own terms
    await updateInvoice(first.invoiceNumber, { type: "SUBSCRIPTION", lines: [{ description: "Fees", quantity: 1, unitAmount: 2000 }], dueDate: "2099-01-31", notes: "" });
    expect(Number((await invoiceOf(first.invoiceNumber)).discount)).toBe(1000);
    // Editing the coupon never changes an invoice already out
    await updateCoupon(id, coupon({ name: "STAFFKID", duration: "ALWAYS", value: 20 }));
    await updateInvoice(first.invoiceNumber, { type: "SUBSCRIPTION", lines: [{ description: "Fees", quantity: 1, unitAmount: 3000 }], dueDate: "2099-01-31", notes: "" });
    expect(Number((await invoiceOf(first.invoiceNumber)).discount)).toBe(1500);

    const given = await db.couponRedemption.findFirstOrThrow({ where: { couponId: id } });
    expect((await removeCouponFromAthlete(s.athleteId, given.id)).success).toBe(true);
    expect(Number((await bill(s.athleteId)).discount ?? 0)).toBe(0);
    // It discounted invoices, so it still counts as used
    expect(await uses(id)).toBe(1);
  });

  it("given for a number of fees invoices: those, then it ends", async () => {
    await signedIn("FINANCE");
    const s = await subscribed(3000);
    await make({ name: "TWO", duration: "INVOICES", durationCount: "2", discountType: "FIXED_AMOUNT", value: 500 });
    await giveCouponToAthlete(s.athleteId, "TWO");
    const discounts = [];
    for (let i = 0; i < 3; i++) discounts.push(Number((await bill(s.athleteId)).discount ?? 0));
    expect(discounts).toEqual([500, 500, 0]);
    expect((await db.couponRedemption.findFirstOrThrow()).status).toBe("ENDED");

    // Canceling one gives it back: the next fees invoice gets it
    const second = await db.invoice.findFirstOrThrow({ where: { discount: { gt: 0 } }, orderBy: { invoiceNumber: "desc" } });
    await setInvoiceCancelled(second.invoiceNumber, true);
    expect(Number((await bill(s.athleteId)).discount ?? 0)).toBe(500);
  });

  it("a long coupon goes on the athlete, a one-time one on either", async () => {
    await signedIn("FINANCE");
    const s = await subscribed();
    const inv = await makeInvoice(s.athleteId, 1000);
    await make({ name: "MONTHLY", duration: "ALWAYS" });
    await make({ name: "ONCE10" });
    expect((await applyCouponToInvoice(inv.invoiceNumber, "MONTHLY")).message).toBe("MONTHLY lasts every fees invoice: give it to the athlete instead (their profile → Coupons).");
    expect((await giveCouponToAthlete(s.athleteId, "ONCE10")).success).toBe(true);
    expect([Number((await bill(s.athleteId)).discount), Number((await bill(s.athleteId)).discount ?? 0)]).toEqual([300, 0]);
  });

  it("says why when a coupon can't be used", async () => {
    await signedIn("FINANCE");
    const s = await subscribed();
    const otherPlan = await makePlan(5000);
    const inv = await makeInvoice(s.athleteId, 1000);
    await make({ name: "OLD", startDate: "2025-01-01", expiryDate: "2025-12-31" });
    const off = await make({ name: "OFF" });
    await setCouponActive(off, false);
    await make({ name: "LATER", startDate: "2099-01-01" });
    await make({ name: "OTHERPLAN", duration: "ALWAYS", plans: [otherPlan.id] });
    expect((await applyCouponToInvoice(inv.invoiceNumber, "OLD")).message).toBe("OLD could be given until 2025-12-31.");
    expect((await applyCouponToInvoice(inv.invoiceNumber, "OFF")).message).toBe("OFF is switched off.");
    expect((await applyCouponToInvoice(inv.invoiceNumber, "LATER")).message).toMatch(/^LATER can be used from 2098-12-31|^LATER can be used from 2099-01-01/);
    expect((await applyCouponToInvoice(inv.invoiceNumber, "NOPE")).message).toBe("There's no coupon NOPE. Check the code.");
    expect((await checkCouponForAthlete(s.athleteId, "OTHERPLAN")).message).toMatch(new RegExp(`^OTHERPLAN is only for ${otherPlan.name}, and .+ is on ${s.plan.name}\\.$`));
  });
});
