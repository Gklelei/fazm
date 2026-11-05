import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeProgramme, resetDb, signedIn } from "@/tests/support/db";
import { saveProgramme, setProgrammeArchived } from "@/features/settings/actions/programmes";
import { inProgramme } from "@/lib/programme";
import { createInvoices } from "@/features/invoices/actions/save-invoice";
import { AddAthleteToSubscriptionPlan } from "@/features/athletes/actions/add-plan";
import { CreateExpense } from "@/features/expenses/actions/expenses";
import { makePlan } from "@/tests/support/db";
import { buildGuardianWhere } from "@/features/guardians/queries";

describe("programmes", () => {
  beforeEach(resetDb);

  it("adds and renames a programme, refusing duplicate names", async () => {
    const { user } = await signedIn("ADMIN");
    expect(await saveProgramme({ name: "Girls" })).toMatchObject({ success: true });
    expect(await saveProgramme({ name: "girls" })).toMatchObject({ success: false, message: 'There\'s already a programme called "girls".' });
    const girls = await db.programme.findFirstOrThrow({ where: { name: "Girls" } });
    expect(await saveProgramme({ name: "Girls Academy" }, girls.id)).toMatchObject({ success: true });
    expect((await db.programme.findUniqueOrThrow({ where: { id: girls.id } })).name).toBe("Girls Academy");
    expect(await db.auditLog.count({ where: { userId: user.id, resource: "Programme" } })).toBe(2);
  });

  it("won't archive a programme that still has batches", async () => {
    await signedIn("ADMIN");
    const elite = await makeProgramme("Elite");
    const batch = await makeBatch("Senior", elite.id);
    expect(await setProgrammeArchived(elite.id, true)).toMatchObject({
      success: false,
      message: "Elite still has 1 batch. Move or archive them first.",
    });
    await db.batches.update({ where: { id: batch.id }, data: { isArchived: true } });
    expect(await setProgrammeArchived(elite.id, true)).toMatchObject({ success: true });
    expect(await setProgrammeArchived(elite.id, false)).toMatchObject({ success: true });
  });

  it("is admin only", async () => {
    const boys = await makeProgramme();
    for (const role of ["COACH", "FINANCE"] as const) {
      await signedIn(role);
      expect((await saveProgramme({ name: "X" })).success).toBe(false);
      expect((await setProgrammeArchived(boys.id, true)).success).toBe(false);
    }
    expect(await db.programme.count()).toBe(1);
  });

  it("scopes athletes, sessions, invoices and payments to a programme", async () => {
    const boys = await makeProgramme("Boys");
    const girls = await makeProgramme("Girls");
    const boy = await makeAthlete({ batchesId: (await makeBatch("U13", boys.id)).id });
    const girl = await makeAthlete({ batchesId: (await makeBatch("U13", girls.id)).id });

    const ids = async (programmeId: string | null) =>
      (await db.athlete.findMany({ where: inProgramme.athlete(programmeId), select: { id: true } })).map((a) => a.id).sort();
    expect(await ids(girls.id)).toEqual([girl.id]);
    expect(await ids(boys.id)).toEqual([boy.id]);
    expect(await ids(null)).toEqual([boy.id, girl.id].sort());

    expect(await db.batches.count({ where: inProgramme.batch(girls.id) })).toBe(1);
    // The fragments are valid queries on each model
    await db.invoice.count({ where: inProgramme.invoice(girls.id) });
    await db.finance.count({ where: inProgramme.payment(girls.id) });
    await db.training.count({ where: inProgramme.session(girls.id) });
    await db.attendance.count({ where: inProgramme.attendance(girls.id) });
    await db.expenses.count({ where: inProgramme.expense(girls.id) });
    await db.subscriptionPlan.count({ where: inProgramme.plan(girls.id) });
  });

  it("only puts a programme's fee plan on that programme's athletes", async () => {
    await signedIn("FINANCE");
    const boys = await makeProgramme("Boys");
    const girls = await makeProgramme("Girls");
    const boy = await makeAthlete({ batchesId: (await makeBatch("U13", boys.id)).id });
    const girl = await makeAthlete({ batchesId: (await makeBatch("U13", girls.id)).id });
    const girlsPlan = await db.subscriptionPlan.update({ where: { id: (await makePlan(3000)).id }, data: { programmeId: girls.id } });
    const line = { description: girlsPlan.name, quantity: 1, unitAmount: 3000, subscriptionPlanId: girlsPlan.id };
    const invoice = (athletes: string[]) =>
      createInvoices({ athletes, type: "SUBSCRIPTION", lines: [line], dueDate: "2026-11-30", notes: "" });

    expect(await invoice([girl.athleteId, boy.athleteId])).toMatchObject({
      success: false,
      message: `${girlsPlan.name} is for another programme than ${boy.athleteId}. Use a plan that fits them.`,
    });
    expect(await db.invoice.count()).toBe(0);
    expect(await invoice([girl.athleteId])).toMatchObject({ success: true });

    expect(await AddAthleteToSubscriptionPlan({ id: girlsPlan.id, mode: "create", athleteId: boy.athleteId })).toMatchObject({
      success: false,
      message: `${girlsPlan.name} is for another programme. Choose a plan for their batch.`,
    });
  });

  it("records an expense for a programme, or shared", async () => {
    await signedIn("FINANCE");
    const girls = await makeProgramme("Girls");
    const kit = await db.expenseCategories.create({ data: { name: "Kit", status: "ACTIVE" } });
    const base = { name: "Bibs", amount: 900, date: new Date(Date.now() - 86_400_000), category: kit.id, description: "" };
    expect(await CreateExpense({ ...base, programmeId: girls.id })).toMatchObject({ success: true });
    expect(await CreateExpense({ ...base, programmeId: "" })).toMatchObject({ success: true });
    expect((await db.expenses.findMany({ orderBy: { createdAt: "asc" } })).map((e) => e.programmeId)).toEqual([girls.id, null]);
    await db.programme.update({ where: { id: girls.id }, data: { isArchived: true } });
    expect(await CreateExpense({ ...base, programmeId: girls.id })).toMatchObject({ success: false, message: "Pick a programme that's in use." });
  });

  it("lists guardians by programme, batch and search, on the server", async () => {
    const boys = await makeProgramme("Boys");
    const girls = await makeProgramme("Girls");
    const u13 = await makeBatch("U13", girls.id);
    const girl = await makeAthlete({ batchesId: u13.id });
    const boy = await makeAthlete({ batchesId: (await makeBatch("U11", boys.id)).id });
    const old = await makeAthlete({ batchesId: u13.id });
    await db.athlete.update({ where: { id: old.id }, data: { isArchived: true } });
    const guardian = (athleteId: string, fullNames: string) =>
      db.athleteGuardian.create({ data: { athleteId, fullNames, phoneNumber: "+254700000001", relationship: "Mother", email: "" } });
    await guardian(girl.athleteId, "Achieng Otieno");
    await guardian(boy.athleteId, "Wanjiku Kamau");
    await guardian(old.athleteId, "Left Academy");

    const names = async (f: Parameters<typeof buildGuardianWhere>[0]) =>
      (await db.athleteGuardian.findMany({ where: buildGuardianWhere(f), select: { fullNames: true } })).map((g) => g.fullNames).sort();
    expect(await names({})).toEqual(["Achieng Otieno", "Wanjiku Kamau"]);
    expect(await names({ programmeId: girls.id })).toEqual(["Achieng Otieno"]);
    expect(await names({ batchId: u13.id })).toEqual(["Achieng Otieno"]);
    expect(await names({ search: "kamau" })).toEqual(["Wanjiku Kamau"]);
  });
});
