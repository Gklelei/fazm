import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { createCoupon, setCouponActive, updateCoupon } from "@/features/coupons/actions/coupons";
import {
  applyCouponToFeePlan,
  applyCouponToInvoice,
  removeCouponFromFeePlan,
  removeCouponFromInvoice,
} from "@/features/coupons/actions/redeem";
import { createInvoices, updateInvoice } from "@/features/invoices/actions/save-invoice";
import type { CouponInput } from "@/features/coupons/schemas";

const coupon = (over: Partial<CouponInput> = {}): CouponInput => ({
  name: "SIBLING10",
  discountType: "PERCENTAGE",
  value: 10,
  interval: "ONCE",
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

const invoiceOf = (n: string) => db.invoice.findUniqueOrThrow({ where: { invoiceNumber: n } });
const used = async (id: string) => (await db.coupon.findUniqueOrThrow({ where: { id } })).timesUsed;

async function subscribed(planAmount = 3000) {
  const athlete = await makeAthlete();
  const plan = await makePlan(planAmount);
  const now = new Date();
  const sub = await db.athleteSubscription.create({
    data: { athleteId: athlete.athleteId, subscriptionPlanId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000) },
  });
  return { athleteId: athlete.athleteId, subId: sub.id, plan };
}

describe("coupons", () => {
  beforeEach(resetDb);

  it("are created, edited and switched on and off by finance only", async () => {
    await signedIn("FINANCE");
    const id = await make({ name: "sibling10" });
    expect((await db.coupon.findUniqueOrThrow({ where: { id } })).name).toBe("SIBLING10");
    expect((await createCoupon(coupon())).message).toBe("SIBLING10 already exists. Choose another code.");
    expect((await createCoupon(coupon({ name: "BIG", value: 150 }))).message).toBe("Up to 100%");

    expect((await setCouponActive(id, false)).success).toBe(true);
    expect((await db.coupon.findUniqueOrThrow({ where: { id } })).status).toBe(0);
    expect((await updateCoupon(id, coupon({ value: 15 }))).success).toBe(true);

    await signedIn("COACH");
    expect((await createCoupon(coupon({ name: "NOPE" }))).success).toBe(false);
  });

  it("a one-time coupon discounts an invoice, keeps its notes, and comes off again", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 4000);
    await db.invoice.update({ where: { id: inv.id }, data: { notes: "Paid by uncle" } });
    const id = await make({ usageLimit: "5" });

    expect((await applyCouponToInvoice(inv.invoiceNumber, "sibling10")).success).toBe(true);
    let after = await invoiceOf(inv.invoiceNumber);
    expect([Number(after.discount), after.notes, after.couponId]).toEqual([400, "Paid by uncle", id]);
    expect(await used(id)).toBe(1);
    expect((await applyCouponToInvoice(inv.invoiceNumber, "SIBLING10")).message).toBe("SIBLING10 is already on this invoice.");

    expect((await removeCouponFromInvoice(inv.invoiceNumber)).success).toBe(true);
    after = await invoiceOf(inv.invoiceNumber);
    expect([Number(after.discount), after.couponId]).toEqual([0, null]);
    expect(await used(id)).toBe(0);
  });

  it("marks an invoice paid when the discount covers what's left", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 1000);
    await db.invoice.update({ where: { id: inv.id }, data: { amountPaid: 900, status: "PARTIAL" } });
    await make({ discountType: "FIXED_AMOUNT", value: 500 });

    await applyCouponToInvoice(inv.invoiceNumber, "SIBLING10");
    const after = await invoiceOf(inv.invoiceNumber);
    // Capped at what was still owed, never an overpayment
    expect([Number(after.discount), after.status]).toEqual([100, "PAID"]);
  });

  it("only discounts its fee plans' charges", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const plan = await makePlan(3000);
    await make({ plans: [plan.id] });
    await createInvoices({
      athletes: [a.athleteId],
      type: "SUBSCRIPTION",
      lines: [
        { description: plan.name, quantity: 1, unitAmount: 3000, subscriptionPlanId: plan.id },
        { description: "Socks", quantity: 2, unitAmount: 500 },
      ],
      dueDate: "2099-01-31",
      notes: "",
    });
    const mixed = await db.invoice.findFirstOrThrow();
    const kit = await makeInvoice(a.athleteId, 800);

    await applyCouponToInvoice(mixed.invoiceNumber, "SIBLING10");
    expect(Number((await invoiceOf(mixed.invoiceNumber)).discount)).toBe(300);
    expect((await applyCouponToInvoice(kit.invoiceNumber, "SIBLING10")).message).toMatch(/^This invoice has no .* charges\.$/);
  });

  it("once per athlete, and never past its limit even at the same moment", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const [one, two] = await Promise.all([makeInvoice(a.athleteId, 1000), makeInvoice(a.athleteId, 1000)]);
    await make({ name: "WELCOME", oncePerAthlete: true });
    await applyCouponToInvoice(one.invoiceNumber, "WELCOME");
    expect((await applyCouponToInvoice(two.invoiceNumber, "WELCOME")).message).toMatch(/once per athlete/);

    const id = await make({ name: "ONEOFF", usageLimit: "1" });
    const others = await Promise.all([makeAthlete(), makeAthlete()]);
    const invs = await Promise.all(others.map((o) => makeInvoice(o.athleteId, 1000)));
    const results = await Promise.all(invs.map((i) => applyCouponToInvoice(i.invoiceNumber, "ONEOFF")));
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(await used(id)).toBe(1);
  });

  it("a repeating coupon on a fee plan discounts each new fees invoice, not other invoices", async () => {
    await signedIn("FINANCE");
    const s = await subscribed(3000);
    const id = await make({ name: "STAFFKID", interval: "REPEATING", value: 50 });

    expect((await applyCouponToFeePlan({ couponCode: "STAFFKID", athleteId: s.athleteId, subId: s.subId })).success).toBe(true);
    expect(await used(id)).toBe(1);

    const bill = (type: "SUBSCRIPTION" | "ITEM_PURCHASE") =>
      createInvoices({
        athletes: [s.athleteId],
        type,
        lines: [{ description: "Fees", quantity: 1, unitAmount: 3000, subscriptionPlanId: s.plan.id }],
        dueDate: "2099-01-31",
        notes: "",
      });
    await bill("SUBSCRIPTION");
    await bill("SUBSCRIPTION");
    await bill("ITEM_PURCHASE");
    const invoices = await db.invoice.findMany({ orderBy: { invoiceNumber: "asc" } });
    expect(invoices.map((i) => Number(i.discount ?? 0))).toEqual([1500, 1500, 0]);
    // Uses count when it goes on the plan, not per invoice
    expect(await used(id)).toBe(1);

    // Editing the lines keeps the percentage right
    await updateInvoice(invoices[0].invoiceNumber, {
      type: "SUBSCRIPTION",
      lines: [{ description: "Fees", quantity: 1, unitAmount: 2000, subscriptionPlanId: s.plan.id }],
      dueDate: "2099-01-31",
      notes: "",
    });
    expect(Number((await invoiceOf(invoices[0].invoiceNumber)).discount)).toBe(1000);

    expect((await removeCouponFromFeePlan({ athleteId: s.athleteId, subId: s.subId })).success).toBe(true);
    expect(await used(id)).toBe(0);
    await bill("SUBSCRIPTION");
    expect(Number((await db.invoice.findFirstOrThrow({ orderBy: { invoiceNumber: "desc" } })).discount ?? 0)).toBe(0);
  });

  it("puts each kind of coupon in its place", async () => {
    await signedIn("FINANCE");
    const s = await subscribed();
    const inv = await makeInvoice(s.athleteId, 1000);
    await make({ name: "ONCE10" });
    await make({ name: "MONTHLY", interval: "REPEATING" });
    expect((await applyCouponToFeePlan({ couponCode: "ONCE10", ...s })).message).toBe("ONCE10 is for one invoice. Apply it on the invoice instead.");
    expect((await applyCouponToInvoice(inv.invoiceNumber, "MONTHLY")).message).toBe("MONTHLY repeats. Put it on the athlete's fee plan instead.");
  });

  it("won't apply expired or switched-off coupons", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 1000);
    await make({ name: "OLD", startDate: "2025-01-01", expiryDate: "2025-12-31" });
    const off = await make({ name: "OFF" });
    await setCouponActive(off, false);
    expect((await applyCouponToInvoice(inv.invoiceNumber, "OLD")).message).toBe("OLD has expired.");
    expect((await applyCouponToInvoice(inv.invoiceNumber, "OFF")).message).toBe("OFF is switched off.");
  });
});
