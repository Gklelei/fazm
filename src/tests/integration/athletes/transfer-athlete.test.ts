import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeInvoice, makeLocation, makePlan, makeProgramme, resetDb, signedIn } from "@/tests/support/db";
import { transferAthlete } from "@/features/athletes/actions/transfer-athlete";
import { createInvoices } from "@/features/invoices/actions/save-invoice";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

/** A Main athlete on a plan, billed once, on the register of a future Main session. */
async function setup() {
  const { staff } = await signedIn("COACH");
  const main = await makeProgramme("Main");
  const girls = await makeProgramme("Girls");
  const [u13, girlsU13, pitch] = await Promise.all([makeBatch("U13", main.id), makeBatch("U13", girls.id), makeLocation()]);
  const [mainPlan, girlsPlan] = await Promise.all([makePlan(4000), makePlan(3500)]);
  await db.subscriptionPlan.update({ where: { id: girlsPlan.id }, data: { programmeId: girls.id } });
  await db.subscriptionPlan.update({ where: { id: mainPlan.id }, data: { programmeId: main.id } });

  const a = await makeAthlete({ batchesId: u13.id });
  const periodEnd = inDays(20);
  await db.athleteSubscription.create({
    data: { athleteId: a.athleteId, subscriptionPlanId: mainPlan.id, currentPeriodStart: inDays(-10), currentPeriodEnd: periodEnd },
  });
  await db.athlete.update({ where: { id: a.id }, data: { nextBillingDate: periodEnd } });
  const invoice = await makeInvoice(a.athleteId, 4000);

  const session = (batchesId: string, days: number) =>
    db.training.create({
      data: { batchesId, name: "Training", description: "x", date: inDays(days), duration: 60, staffId: staff!.staffId, trainingLocationsId: pitch.id },
    });
  const [oldFuture, oldPast, newFuture] = await Promise.all([session(u13.id, 3), session(u13.id, -3), session(girlsU13.id, 4)]);
  for (const s of [oldFuture, oldPast]) await db.training.update({ where: { id: s.id }, data: { athletes: { connect: { id: a.id } } } });

  await signedIn("ADMIN");
  return { main, girls, u13, girlsU13, mainPlan, girlsPlan, a, invoice, periodEnd, oldFuture, oldPast, newFuture };
}

describe("transferring an athlete to another programme", () => {
  beforeEach(resetDb);

  it("moves them with their ID and records, onto the new plan, billing nothing now", async () => {
    const s = await setup();
    const res = await transferAthlete({ athleteId: s.a.athleteId, toBatch: s.girlsU13.id, subscriptionPlanId: s.girlsPlan.id, reason: "Moved to the girls' side" });
    expect(res).toMatchObject({ success: true, message: `${s.a.firstName} moved to Girls U13.` });

    const a = await db.athlete.findUniqueOrThrow({ where: { id: s.a.id } });
    expect(a).toMatchObject({ athleteId: s.a.athleteId, batchesId: s.girlsU13.id });
    expect(await db.athleteTransfer.findFirstOrThrow()).toMatchObject({
      athleteId: s.a.id,
      fromProgrammeId: s.main.id,
      toProgrammeId: s.girls.id,
      fromBatchId: s.u13.id,
      toBatchId: s.girlsU13.id,
      reason: "Moved to the girls' side",
    });

    // Same billing date, new plan; nothing billed now
    const subs = await db.athleteSubscription.findMany({ where: { athleteId: a.athleteId }, orderBy: { createdAt: "asc" } });
    expect(subs.map((x) => [x.subscriptionPlanId, x.status])).toEqual([
      [s.mainPlan.id, "INACTIVE"],
      [s.girlsPlan.id, "ACTIVE"],
    ]);
    expect(subs[1].currentPeriodEnd.getTime()).toBe(s.periodEnd.getTime());
    expect(await db.invoice.count()).toBe(1);

    // The old bill stays with Main; the next one staff raise is Girls', and Main-only plans no longer fit
    expect((await db.invoice.findUniqueOrThrow({ where: { id: s.invoice.id } })).programmeId).toBe(s.main.id);
    const line = (planId: string, amount: number) => ({ description: "December fees", quantity: 1, unitAmount: amount, subscriptionPlanId: planId });
    expect(await createInvoices({ athletes: [a.athleteId], type: "SUBSCRIPTION", lines: [line(s.mainPlan.id, 4000)], dueDate: "2026-12-30", notes: "" })).toMatchObject({
      success: false,
    });
    expect(await createInvoices({ athletes: [a.athleteId], type: "SUBSCRIPTION", lines: [line(s.girlsPlan.id, 3500)], dueDate: "2026-12-30", notes: "" })).toMatchObject({
      success: true,
    });
    expect((await db.invoice.findFirstOrThrow({ where: { NOT: { id: s.invoice.id } } })).programmeId).toBe(s.girls.id);

    // Unmarked future sessions move; past ones keep them on the register
    const on = async (id: string) => (await db.training.findUniqueOrThrow({ where: { id }, include: { athletes: true } })).athletes.map((x) => x.id);
    expect(await on(s.oldFuture.id)).toEqual([]);
    expect(await on(s.oldPast.id)).toEqual([s.a.id]);
    expect(await on(s.newFuture.id)).toEqual([s.a.id]);

    expect(await db.auditLog.findFirstOrThrow({ where: { action: "TRANSFER_ATHLETE" } })).toMatchObject({
      athleteId: s.a.id,
      details: expect.stringContaining("from Main U13 to Girls U13"),
    });
  });

  it("keeps the subscription when the plan fits both programmes", async () => {
    const s = await setup();
    await db.subscriptionPlan.update({ where: { id: s.mainPlan.id }, data: { programmeId: null } });
    expect((await transferAthlete({ athleteId: s.a.athleteId, toBatch: s.girlsU13.id, subscriptionPlanId: s.mainPlan.id })).success).toBe(true);
    expect(await db.athleteSubscription.count()).toBe(1);
  });

  it("refuses a batch in the same programme, or a plan for another one", async () => {
    const s = await setup();
    const u15 = await makeBatch("U15", s.main.id);
    expect(await transferAthlete({ athleteId: s.a.athleteId, toBatch: u15.id, subscriptionPlanId: s.mainPlan.id })).toMatchObject({
      success: false,
      message: "Choose a batch outside Main, or change their batch from Edit details.",
    });
    expect(await transferAthlete({ athleteId: s.a.athleteId, toBatch: s.girlsU13.id, subscriptionPlanId: s.mainPlan.id })).toMatchObject({
      success: false,
      message: expect.stringContaining("is for another programme. Choose a plan for Girls."),
    });
    expect(await db.athleteTransfer.count()).toBe(0);
    expect((await db.athlete.findUniqueOrThrow({ where: { id: s.a.id } })).batchesId).toBe(s.u13.id);
  });

  it("is for admins only", async () => {
    const s = await setup();
    for (const role of ["COACH", "FINANCE"] as const) {
      await signedIn(role);
      expect((await transferAthlete({ athleteId: s.a.athleteId, toBatch: s.girlsU13.id, subscriptionPlanId: s.girlsPlan.id })).success).toBe(false);
    }
    expect(await db.athleteTransfer.count()).toBe(0);
  });
});
