import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { createAuditLog, diffFields } from "@/lib/audit";
import createFinancialTransaction from "@/features/finance/actions/create-transaction";
import deleteFinancialTransaction from "@/features/finance/actions/delete-transaction";
import { UpdateSubscriptionPlan } from "@/features/finance/actions/edit-plan";
import { CreateExpenseCategoryAction } from "@/features/expenses/actions/expense-categories";
import { updateMyProfile } from "@/features/staff/actions/edit-staff";
import { setStaffArchived } from "@/features/staff/actions/save-staff";

describe("activity log entries", () => {
  beforeEach(resetDb);

  it("record the person's role at the time", async () => {
    const { user } = await signedIn("FINANCE");
    await CreateExpenseCategoryAction({ name: "Transport", status: "ACTIVE" });
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "CREATE_EXPENSE_CATEGORY" } });
    expect(entry).toMatchObject({ userId: user.id, role: "FINANCE", resource: "ExpenseCategory" });
    expect(entry.recordId).toBeTruthy();
  });

  it("store only what changed in an edit", async () => {
    await signedIn("FINANCE");
    const plan = await makePlan(4000);
    const edit = (amount: number) =>
      UpdateSubscriptionPlan({
        id: plan.id,
        data: { name: plan.name, amount, interval: "MONTHLY", status: "ACTIVE", description: "Monthly fees" },
      });
    expect((await edit(4000)).success).toBe(true);
    expect((await edit(4500)).success).toBe(true);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "UPDATE_PLAN" }, orderBy: { createdAt: "desc" } });
    expect(entry.changes).toEqual({ before: { amount: 4000 }, after: { amount: 4500 } });
  });

  it("link a deleted payment to its athlete (payments hold the public athlete number)", async () => {
    await signedIn("FINANCE");
    const athlete = await makeAthlete();
    const invoice = await makeInvoice(athlete.athleteId, 4000);
    await createFinancialTransaction({
      amountPaid: "1000",
      paymentDate: new Date().toISOString(),
      paymentType: "MPESA_PAYBILL",
      collectedBy: "Front office",
      athleteId: athlete.athleteId,
      invoiceId: invoice.invoiceNumber,
    });
    const payment = await db.finance.findFirstOrThrow();
    expect((await deleteFinancialTransaction(payment.id)).success).toBe(true);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: "DELETE_PAYMENT" } });
    expect(entry.athleteId).toBe(athlete.id);
  });

  it("link an athlete by either their record id or public number", async () => {
    const athlete = await makeAthlete();
    await createAuditLog({ action: "X", resource: "Y", athleteId: athlete.athleteId });
    await createAuditLog({ action: "X", resource: "Y", athleteId: athlete.id });
    await createAuditLog({ action: "X", resource: "Y", athleteId: "no-such-athlete" });
    const rows = await db.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.athleteId)).toEqual([athlete.id, athlete.id, null]);
  });

  it("never fail the change when the log can't be written", async () => {
    await expect(createAuditLog({ action: "X", resource: "Y", userId: "no-such-user" })).resolves.toBeUndefined();
    expect(await db.auditLog.count()).toBe(0);
  });

  it("can hide secret values in a diff", () => {
    expect(diffFields({ a: 1, secret: "old" }, { a: 1, secret: "new" }, ["secret"])).toEqual({
      before: { secret: "(hidden)" },
      after: { secret: "(hidden)" },
    });
    expect(diffFields({ a: 1 }, { a: 1 })).toBeNull();
  });
});

describe("own profile", () => {
  beforeEach(resetDb);

  it("changes only your own record", async () => {
    const { user: other } = await signedIn("ADMIN");
    const { user: me, staff } = await signedIn("COACH");
    const res = await updateMyProfile({ fullNames: "New Name", photo: "", phoneNumber: "0711 222 333", emergencyName: "", emergencyRelationship: "", emergencyPhone: "" });
    expect(res.success).toBe(true);
    expect((await db.staff.findUniqueOrThrow({ where: { id: staff!.id } })).phoneNumber).toBe("0711222333");
    expect((await db.user.findUniqueOrThrow({ where: { id: me.id } })).name).toBe("New Name");
    expect((await db.user.findUniqueOrThrow({ where: { id: other.id } })).name).not.toBe("New Name");
  });
});

describe("archiving a staff member", () => {
  beforeEach(resetDb);

  it("signs them out everywhere", async () => {
    const { user: coach, staff } = await signedIn("COACH");
    await db.session.create({ data: { userId: coach.id, token: "t1", expiresAt: new Date(Date.now() + 3_600_000) } });
    await signedIn("ADMIN");
    expect((await setStaffArchived(staff!.staffId, true)).success).toBe(true);
    expect(await db.session.count({ where: { userId: coach.id } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: coach.id } })).isArchived).toBe(true);
  });
});
