import { beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/lib/prisma";
import { makeBatch, resetDb, signedIn } from "@/tests/support/db";
import { createStaff, resetStaffPassword, setStaffArchived, updateStaff } from "@/features/staff/actions/save-staff";
import type { StaffInput } from "@/features/staff/schemas";

const base = (over: Partial<StaffInput> = {}): StaffInput => ({
  fullNames: "Wanjiku Test",
  phoneNumber: "0712 345 678",
  email: "",
  photo: "",
  jobTitle: "Groundsman",
  startDate: "2026-01-05",
  nationalId: "",
  kraPin: "",
  nssfNumber: "",
  shifNumber: "",
  salary: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  batches: [],
  documents: [],
  canSignIn: false,
  role: "COACH",
  ...over,
});

const loginOf = async (staffId: string) =>
  (await db.staff.findUniqueOrThrow({ where: { staffId }, include: { user: { include: { accounts: true } } } })).user;

describe("adding staff", () => {
  beforeEach(resetDb);

  it("adds someone without a sign-in, with their batches and documents", async () => {
    await signedIn("ADMIN");
    const batch = await makeBatch();
    const res = await createStaff(
      base({ salary: "25000", kraPin: "a123456789b", batches: [batch.id], documents: [{ kind: "CONTRACT", name: "Contract 2026", url: "/uploads/STAFF_DOCUMENTS/c.pdf" }] }),
    );
    expect(res).toMatchObject({ success: true, staffId: "STAFF-FFA-1001", tempPassword: null });
    const s = await db.staff.findUniqueOrThrow({ where: { staffId: "STAFF-FFA-1001" }, include: { batches: true, documents: true } });
    // A salary only saves when the payroll person sends it
    expect([s.userId, s.phoneNumber, s.kraPin, s.salary, s.batches.length, s.documents.length]).toEqual([null, "0712345678", "A123456789B", null, 1, 1]);
    expect(await db.auditLog.count({ where: { action: "CREATE_STAFF", recordId: "STAFF-FFA-1001" } })).toBe(1);
  });

  it("gives a sign-in with a one-time password that must be changed", async () => {
    await signedIn("ADMIN");
    const res = await createStaff(base({ canSignIn: true, email: "Coach@Example.test", role: "COACH" }));
    if (!res.success || !("tempPassword" in res) || !res.tempPassword) throw new Error("no password");
    expect(res.tempPassword).toMatch(/^Fazam-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const user = await loginOf(res.staffId);
    expect([user?.email, user?.role, user?.mustChangePassword]).toEqual(["coach@example.test", "COACH", true]);
    expect(await verifyPassword({ hash: user!.accounts[0].password!, password: res.tempPassword })).toBe(true);
  });

  it("refuses an email that already signs in, and saves nothing", async () => {
    const { user } = await signedIn("ADMIN");
    const res = await createStaff(base({ canSignIn: true, email: user.email }));
    expect(res).toMatchObject({ success: false, message: expect.stringMatching(/already signs in/) });
    expect(await db.staff.count()).toBe(0);
  });

  it("needs an email to sign in, and checks a KRA PIN", async () => {
    await signedIn("ADMIN");
    expect((await createStaff(base({ canSignIn: true }))).message).toBe("Enter the email they'll sign in with");
    expect((await createStaff(base({ kraPin: "12345" }))).message).toBe("A KRA PIN looks like A123456789B");
  });

  it("keeps super admin access for super admins, and staff for admins", async () => {
    await signedIn("ADMIN");
    expect((await createStaff(base({ canSignIn: true, email: "a@example.test", role: "SUPER_ADMIN" }))).success).toBe(false);
    await signedIn("COACH");
    expect((await createStaff(base())).success).toBe(false);
  });
});

describe("sign-in, role and archiving", () => {
  beforeEach(resetDb);

  async function coach() {
    await signedIn("ADMIN");
    const res = await createStaff(base({ canSignIn: true, email: "coach@example.test" }));
    if (!res.success || !("staffId" in res)) throw new Error(res.message);
    const user = (await loginOf(res.staffId))!;
    await db.session.create({ data: { userId: user.id, token: `t-${user.id}`, expiresAt: new Date(Date.now() + 3600_000) } });
    return { staffId: res.staffId, userId: user.id };
  }

  it("turning sign-in off stops access now; turning it on gives a new password", async () => {
    const { staffId, userId } = await coach();
    await updateStaff(staffId, base({ email: "coach@example.test", canSignIn: false }));
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).isArchived).toBe(true);
    expect(await db.session.count({ where: { userId } })).toBe(0);

    const on = await updateStaff(staffId, base({ email: "coach@example.test", canSignIn: true, role: "FINANCE" }));
    expect(on).toMatchObject({ success: true, tempPassword: expect.stringMatching(/^Fazam-/) });
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect([user.isArchived, user.role, user.mustChangePassword]).toEqual([false, "FINANCE", true]);
    expect(await db.auditLog.count({ where: { action: "ROLE_CHANGE", recordId: staffId } })).toBe(2);
  });

  it("logs what changed", async () => {
    const { staffId } = await coach();
    await signedIn("ADMIN", { payrollAccess: true });
    await updateStaff(staffId, base({ email: "coach@example.test", canSignIn: true, jobTitle: "Head coach", salary: "30000" }));
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "UPDATE_STAFF" } });
    expect(log.changes).toMatchObject({ before: { jobTitle: "Groundsman", salary: null }, after: { jobTitle: "Head coach", salary: 30000 } });
  });

  it("won't let you change your own role", async () => {
    const { user } = await signedIn("ADMIN");
    const s = await db.staff.create({ data: { staffId: "STAFF-FFA-1500", fullNames: user.name, phoneNumber: "0712345678", userId: user.id } });
    const res = await updateStaff(s.staffId, base({ fullNames: user.name, email: user.email, canSignIn: true, role: "COACH" }));
    expect(res).toMatchObject({ success: false, message: expect.stringMatching(/your own role/) });
  });

  it("a new one-time password signs them out", async () => {
    const { staffId, userId } = await coach();
    const res = await resetStaffPassword(staffId);
    if (!res.success || !("tempPassword" in res)) throw new Error(res.message);
    const account = await db.account.findFirstOrThrow({ where: { userId } });
    expect(await verifyPassword({ hash: account.password!, password: res.tempPassword })).toBe(true);
    expect(await db.session.count({ where: { userId } })).toBe(0);
  });

  it("archiving stops sign-in; restoring leaves it off", async () => {
    const { staffId, userId } = await coach();
    await setStaffArchived(staffId, true);
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).isArchived).toBe(true);
    expect((await updateStaff(staffId, base({ email: "coach@example.test" }))).message).toBe("Restore them before editing.");
    await setStaffArchived(staffId, false);
    expect((await db.staff.findUniqueOrThrow({ where: { staffId } })).isArchived).toBe(false);
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).isArchived).toBe(true);
  });
});

describe("payroll access", () => {
  beforeEach(resetDb);

  const withLogin = (email: string, over: Partial<StaffInput> = {}) => base({ fullNames: email.split("@")[0], email, canSignIn: true, role: "ADMIN", ...over });

  it("only the super admin gives it, and only to one person", async () => {
    await signedIn("ADMIN");
    const a = await createStaff(withLogin("head@example.test", { payrollAccess: true }));
    if (!a.success || !("staffId" in a)) throw new Error(a.message);
    expect((await loginOf(a.staffId))?.payrollAccess).toBe(false); // an admin can't give it

    await signedIn("SUPER_ADMIN");
    expect((await updateStaff(a.staffId, withLogin("head@example.test", { payrollAccess: true }))).success).toBe(true);
    expect((await loginOf(a.staffId))?.payrollAccess).toBe(true);

    const b = await createStaff(withLogin("second@example.test", { payrollAccess: true }));
    expect(b).toMatchObject({ success: false, message: expect.stringMatching(/has payroll access/) });

    // Handing over: off for the first, then on for the second
    await updateStaff(a.staffId, withLogin("head@example.test", { payrollAccess: false }));
    const c = await createStaff(withLogin("second@example.test", { payrollAccess: true }));
    if (!c.success || !("staffId" in c)) throw new Error(c.message);
    expect((await loginOf(c.staffId))?.payrollAccess).toBe(true);
    expect(await db.user.count({ where: { payrollAccess: true } })).toBe(1);
  });

  it("keeps pay details when another admin edits the record", async () => {
    await signedIn("ADMIN", { payrollAccess: true });
    const r = await createStaff(base({ salary: "40000", payBasis: "MONTHLY" }));
    if (!r.success || !("staffId" in r)) throw new Error(r.message);

    await signedIn("ADMIN");
    await updateStaff(r.staffId, base({ jobTitle: "Kit manager" }));
    const s = await db.staff.findUniqueOrThrow({ where: { staffId: r.staffId } });
    expect([s.jobTitle, Number(s.salary), s.payBasis]).toEqual(["Kit manager", 40000, "MONTHLY"]);
  });

  it("goes when the person is archived", async () => {
    await signedIn("SUPER_ADMIN");
    const r = await createStaff(withLogin("head@example.test", { payrollAccess: true }));
    if (!r.success || !("staffId" in r)) throw new Error(r.message);
    await setStaffArchived(r.staffId, true);
    expect((await loginOf(r.staffId))?.payrollAccess).toBe(false);
  });
});
