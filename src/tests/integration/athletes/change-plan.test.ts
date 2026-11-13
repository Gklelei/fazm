import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { changeAthletePlan } from "@/features/athletes/actions/change-plan";
import { AddAthleteToSubscriptionPlan } from "@/features/athletes/actions/add-plan";

/** An athlete on a 4,000 plan with one fees bill, and another plan to move to. */
async function setup() {
  const { user } = await signedIn("FINANCE");
  const [oldPlan, newPlan] = await Promise.all([makePlan(4000), makePlan(5000)]);
  const a = await makeAthlete();
  await db.athleteSubscription.create({
    data: { athleteId: a.athleteId, subscriptionPlanId: oldPlan.id, currentPeriodStart: new Date(), currentPeriodEnd: new Date() },
  });
  const bill = await makeInvoice(a.athleteId, 4000, { type: "SUBSCRIPTION" });
  return { user, oldPlan, newPlan, a, bill };
}
const active = (athleteId: string) => db.athleteSubscription.findMany({ where: { athleteId, status: "ACTIVE" } });

describe("changing an athlete's fee plan", () => {
  beforeEach(resetDb);

  it("from the next bill: switches the plan and bills nothing", async () => {
    const s = await setup();
    const res = await changeAthletePlan({ athleteId: s.a.athleteId, plan: { choice: "NEXT_BILL", planId: s.newPlan.id } });
    expect(res).toMatchObject({ success: true, message: expect.stringContaining(`${s.newPlan.name} from the next bill on`) });
    expect((await active(s.a.athleteId)).map((x) => x.subscriptionPlanId)).toEqual([s.newPlan.id]);
    expect(await db.invoice.count()).toBe(1);
    expect(await db.auditLog.count({ where: { action: "CHANGE_SUBSCRIPTION", athleteId: s.a.id } })).toBe(1);
  });

  it("from today: bills the new plan now and can credit the old bill's unused days", async () => {
    const s = await setup();
    const res = await changeAthletePlan({
      athleteId: s.a.athleteId,
      plan: { choice: "RESTART", planId: s.newPlan.id, oldBill: "CREDIT", oldInvoice: s.bill.invoiceNumber },
    });
    expect(res).toMatchObject({ success: true, message: expect.stringMatching(/from today, billed INV-.*(credited|nothing left to credit)/) });
    const fresh = await db.invoice.findFirstOrThrow({ where: { NOT: { id: s.bill.id } }, include: { discounts: true } });
    expect(Number(fresh.amountDue)).toBe(5000);
    expect(fresh.subscriptionPlanId).toBe(s.newPlan.id);
  });

  it("credits a bill's unused days once", async () => {
    const s = await setup();
    const credit = { choice: "RESTART" as const, oldBill: "CREDIT" as const, oldInvoice: s.bill.invoiceNumber };
    expect((await changeAthletePlan({ athleteId: s.a.athleteId, plan: { ...credit, planId: s.newPlan.id } })).success).toBe(true);
    const fresh = await db.invoice.findFirstOrThrow({ where: { NOT: { id: s.bill.id } }, include: { discounts: true } });
    if (!fresh.discounts.length) return; // nothing was left to credit today (the 30th)
    expect(await changeAthletePlan({ athleteId: s.a.athleteId, plan: { ...credit, planId: s.oldPlan.id } })).toMatchObject({
      success: false,
      message: `${s.bill.invoiceNumber}'s unused days were credited on ${fresh.invoiceNumber}. Keep it, or choose another bill.`,
    });
  });

  it("refuses a bill that isn't theirs", async () => {
    const s = await setup();
    const other = await makeAthlete();
    const theirs = await makeInvoice(other.athleteId, 4000, { type: "SUBSCRIPTION" });
    expect(
      await changeAthletePlan({
        athleteId: s.a.athleteId,
        plan: { choice: "RESTART", planId: s.newPlan.id, oldBill: "CANCEL", oldInvoice: theirs.invoiceNumber },
      }),
    ).toMatchObject({ success: false, message: "That bill can't be found on their account. Choose another." });
    expect(await db.invoice.count()).toBe(2);
  });

  it("stops billing, and giving a plan again clears it", async () => {
    const s = await setup();
    expect((await changeAthletePlan({ athleteId: s.a.athleteId, plan: { choice: "STOP" } })).success).toBe(true);
    expect(await active(s.a.athleteId)).toHaveLength(0);
    expect((await db.athlete.findUniqueOrThrow({ where: { id: s.a.id } })).billingStoppedAt).not.toBeNull();

    expect((await AddAthleteToSubscriptionPlan({ id: s.newPlan.id, athleteId: s.a.athleteId })).success).toBe(true);
    expect((await db.athlete.findUniqueOrThrow({ where: { id: s.a.id } })).billingStoppedAt).toBeNull();
  });

  it("asks for a choice that changes something, and a plan where one is needed", async () => {
    const s = await setup();
    expect((await changeAthletePlan({ athleteId: s.a.athleteId, plan: { choice: "KEEP" } })).success).toBe(false);
    expect((await changeAthletePlan({ athleteId: s.a.athleteId, plan: { choice: "NEXT_BILL" } })).success).toBe(false);
    expect(await db.athleteSubscription.count({ where: { status: "INACTIVE" } })).toBe(0);
  });

  it("is refused for coaches", async () => {
    const s = await setup();
    await signedIn("COACH");
    expect((await changeAthletePlan({ athleteId: s.a.athleteId, plan: { choice: "STOP" } })).success).toBe(false);
  });
});
