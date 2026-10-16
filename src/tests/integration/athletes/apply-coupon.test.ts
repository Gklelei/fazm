import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { ApplyCouponToAtheleteSubscriptionPlan as apply } from "@/features/athletes/actions/apply-coupon";

async function subscribed() {
  const athlete = await makeAthlete();
  const plan = await makePlan();
  const now = new Date();
  const sub = await db.athleteSubscription.create({
    data: { athleteId: athlete.athleteId, subscriptionPlanId: plan.id, currentPeriodStart: now, currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000) },
  });
  return { athleteId: athlete.athleteId, subId: sub.id };
}

const coupon = (name: string, extra: Partial<{ usageLimit: number; expiryDate: Date }> = {}) =>
  db.coupon.create({ data: { name, value: 10, ...extra } });

describe("applying a coupon to a subscription", () => {
  beforeEach(resetDb);

  it("applies it once and counts the use", async () => {
    await signedIn("FINANCE");
    const s = await subscribed();
    await coupon("SIBLING10");

    expect((await apply({ couponCode: " sibling10 ", ...s })).success).toBe(true);
    expect((await apply({ couponCode: "SIBLING10", ...s })).message).toBe("Coupon is already applied to this subscription");
    expect((await db.coupon.findUniqueOrThrow({ where: { name: "SIBLING10" } })).timesUsed).toBe(1);
  });

  it("never goes past the usage limit, even at the same moment", async () => {
    await signedIn("FINANCE");
    await coupon("ONEOFF", { usageLimit: 1 });
    const subs = await Promise.all([subscribed(), subscribed()]);

    const results = await Promise.all(subs.map((s) => apply({ couponCode: "ONEOFF", ...s })));

    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { name: "ONEOFF" } })).timesUsed).toBe(1);
  });

  it("refuses expired coupons and a second, different coupon", async () => {
    await signedIn("FINANCE");
    const s = await subscribed();
    await coupon("OLD", { expiryDate: new Date(Date.now() - 86_400_000) });
    await coupon("A");
    await coupon("B");

    expect((await apply({ couponCode: "OLD", ...s })).message).toBe("Coupon has expired");
    await apply({ couponCode: "A", ...s });
    expect((await apply({ couponCode: "B", ...s })).success).toBe(false);
  });

  it("is refused for coaches", async () => {
    await signedIn("COACH");
    const s = await subscribed();
    await coupon("X");
    expect((await apply({ couponCode: "X", ...s })).success).toBe(false);
  });
});
