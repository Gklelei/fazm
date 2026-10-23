"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { Prisma } from "@/generated/prisma/client";
import type { ROLES } from "@/generated/prisma/enums";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { canRunPayroll, ROLE_LABEL } from "@/lib/roles";
import { nextStaffId, STAFF_ID_PREFIX } from "@/features/staff/lib/staff-id";
import { tempPassword } from "@/features/staff/lib/temp-password";
import { staffSchema, type StaffInput, type StaffValues } from "@/features/staff/schemas";

type Tx = Prisma.TransactionClient;
type Me = { id: string; role?: string | null; payrollAccess?: boolean | null };

const SUPER_ONLY = "Only a super admin can give, change or remove super admin access.";
const SELF = "You can't change your own role or sign-in here. Ask another admin.";

/** The staff record's own fields from the form. */
function recordOf(v: StaffValues) {
  return {
    fullNames: v.fullNames,
    phoneNumber: v.phoneNumber,
    email: v.email || null,
    photo: v.photo || null,
    jobTitle: v.jobTitle || null,
    startDate: v.startDate ? new Date(`${v.startDate}T00:00:00Z`) : null,
    nationalId: v.nationalId || null,
    kraPin: v.kraPin || null,
    nssfNumber: v.nssfNumber || null,
    shifNumber: v.shifNumber || null,
    salary: v.salary ? new Prisma.Decimal(v.salary) : null,
    payBasis: v.payBasis || null,
    sessionRate: v.sessionRate ? new Prisma.Decimal(v.sessionRate) : null,
    payMethod: v.payMethod || null,
    payAccount: v.payAccount || null,
    emergencyName: v.emergencyName || null,
    emergencyPhone: v.emergencyPhone || null,
    emergencyRelationship: v.emergencyRelationship || null,
  };
}

const PAY_FIELDS = new Set(["salary", "payBasis", "sessionRate", "payMethod", "payAccount"]);

/** The record to save: pay details only change when the payroll person saves. */
type PayKey = "salary" | "payBasis" | "sessionRate" | "payMethod" | "payAccount";
type StaffRecordData = ReturnType<typeof recordOf>;
function recordFor(v: StaffValues, me: Me): Omit<StaffRecordData, PayKey> & Partial<Pick<StaffRecordData, PayKey>> {
  const r = recordOf(v);
  return canRunPayroll(me) ? r : (Object.fromEntries(Object.entries(r).filter(([k]) => !PAY_FIELDS.has(k))) as Omit<StaffRecordData, PayKey>);
}

/** Gives or takes payroll access. One holder at a time (the database refuses a second too). */
async function setPayrollAccess(tx: Tx, userId: string, on: boolean) {
  if (on) {
    const other = await tx.user.findFirst({ where: { payrollAccess: true, id: { not: userId } }, select: { name: true } });
    if (other) throw new ActionError(`${other.name} has payroll access. Turn it off on their staff page first.`);
  }
  await tx.user.update({ where: { id: userId }, data: { payrollAccess: on } });
  // Takes effect now, not when their sign-in next refreshes
  await tx.session.deleteMany({ where: { userId } });
}

async function checkBatches(tx: Tx, ids: string[]) {
  const found = await tx.batches.count({ where: { id: { in: ids }, isArchived: false } });
  if (found !== new Set(ids).size) throw new ActionError("One of those batches is no longer available. Choose again.");
}

async function emailFree(tx: Tx, email: string, exceptUserId?: string) {
  const other = await tx.user.findUnique({ where: { email }, select: { id: true } });
  if (other && other.id !== exceptUserId) throw new ActionError("That email already signs in to another account. Use a different one.");
}

/** Sets a new one-time password that must be replaced at first sign-in, and signs them out. */
async function setTempPassword(tx: Tx, userId: string) {
  const password = tempPassword();
  const hash = await hashPassword(password);
  const updated = await tx.account.updateMany({ where: { userId, providerId: "credential" }, data: { password: hash } });
  if (!updated.count) await tx.account.create({ data: { userId, accountId: userId, providerId: "credential", password: hash } });
  await tx.user.update({ where: { id: userId }, data: { mustChangePassword: true } });
  await tx.session.deleteMany({ where: { userId } });
  return password;
}

async function createLogin(tx: Tx, v: StaffValues) {
  await emailFree(tx, v.email);
  const user = await tx.user.create({
    data: { name: v.fullNames, email: v.email, role: v.role, image: v.photo || null, mustChangePassword: true },
  });
  return { userId: user.id, password: await setTempPassword(tx, user.id) };
}

const documentRows = (v: StaffValues, uploadedById: string) =>
  v.documents.map((d) => ({ kind: d.kind, name: d.name || d.kind, url: d.url, uploadedById }));

const touched = () => {
  revalidatePath("/staff");
  lookupsChanged(LOOKUP.coaches);
  lookupsChanged(LOOKUP.batches);
};

export async function createStaff(input: StaffInput) {
  return asRole("admin", async (me) => {
    const v = staffSchema.parse(input);
    if (v.canSignIn && v.role === "SUPER_ADMIN" && me.role !== "SUPER_ADMIN") throw new ActionError(SUPER_ONLY);

    const created = await db.$transaction(async (tx) => {
      await checkBatches(tx, v.batches);
      // One number at a time, so two admins adding staff together don't clash
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('staff_id'))`;
      const taken = await tx.staff.findMany({ where: { staffId: { startsWith: STAFF_ID_PREFIX } }, select: { staffId: true } });
      const staffId = nextStaffId(taken.map((t) => t.staffId));
      const login = v.canSignIn ? await createLogin(tx, v) : null;
      if (login && v.payrollAccess && me.role === "SUPER_ADMIN") await setPayrollAccess(tx, login.userId, true);
      await tx.staff.create({
        data: {
          ...recordFor(v, me),
          staffId,
          userId: login?.userId,
          batches: { connect: v.batches.map((id) => ({ id })) },
          documents: { create: documentRows(v, me.id) },
        },
      });
      return { staffId, password: login?.password ?? null };
    });

    touched();
    await createAuditLog({
      action: "CREATE_STAFF",
      resource: "Staff",
      details: `Added ${v.fullNames} (${created.staffId})${v.jobTitle ? `, ${v.jobTitle}` : ""}; ${
        v.canSignIn ? `signs in as ${v.email} (${ROLE_LABEL[v.role]})` : "no sign-in"
      }${v.canSignIn && v.payrollAccess && me.role === "SUPER_ADMIN" ? "; payroll access" : ""}`,
      userId: me.id,
      recordId: created.staffId,
    });
    return {
      success: true as const,
      message: `${v.fullNames} is added as ${created.staffId}.`,
      staffId: created.staffId,
      tempPassword: created.password,
    };
  });
}

export async function updateStaff(staffId: string, input: StaffInput) {
  return asRole("admin", async (me) => {
    const v = staffSchema.parse(input);

    const result = await db.$transaction(async (tx) => {
      const before = await tx.staff.findUnique({
        where: { staffId },
        include: { user: true, batches: { select: { id: true, name: true } }, documents: true },
      });
      if (!before) throw new ActionError("That staff member no longer exists.");
      if (before.isArchived) throw new ActionError("Restore them before editing.");
      await checkBatches(tx, v.batches);

      const hadAccess = !!before.user && !before.user.isArchived;
      const roleBefore = hadAccess ? before.user!.role : null;
      const roleAfter: ROLES | null = v.canSignIn ? v.role : null;
      if (before.userId === me.id && roleAfter !== roleBefore) throw new ActionError(SELF);
      if ((roleBefore === "SUPER_ADMIN" || roleAfter === "SUPER_ADMIN") && roleAfter !== roleBefore && me.role !== "SUPER_ADMIN") {
        throw new ActionError(SUPER_ONLY);
      }

      let userId = before.userId;
      let password: string | null = null;
      if (v.canSignIn && !before.user) {
        const login = await createLogin(tx, v);
        userId = login.userId;
        password = login.password;
      } else if (v.canSignIn && before.user) {
        await emailFree(tx, v.email, before.user.id);
        await tx.user.update({
          where: { id: before.user.id },
          data: { name: v.fullNames, email: v.email, role: v.role, image: v.photo || null, isArchived: false },
        });
        // Turning sign-in back on gives a fresh one-time password
        if (!hadAccess) password = await setTempPassword(tx, before.user.id);
        // A new role takes effect now, not when their sign-in next refreshes
        else if (roleBefore !== v.role) await tx.session.deleteMany({ where: { userId: before.user.id } });
      } else if (hadAccess) {
        await tx.user.update({ where: { id: before.user!.id }, data: { isArchived: true } });
        await tx.session.deleteMany({ where: { userId: before.user!.id } });
      }

      // Payroll access: the super admin decides; no sign-in means no access
      const accessBefore = hadAccess && !!before.user?.payrollAccess;
      const accessAfter = me.role === "SUPER_ADMIN" ? v.canSignIn && v.payrollAccess : v.canSignIn && accessBefore;
      if (userId && accessAfter !== !!before.user?.payrollAccess) await setPayrollAccess(tx, userId, accessAfter);

      const keep = new Set(v.documents.map((d) => d.url));
      const have = new Set(before.documents.map((d) => d.url));
      await tx.staffDocument.deleteMany({ where: { staffId: before.id, url: { notIn: [...keep] } } });
      await tx.staff.update({
        where: { id: before.id },
        data: {
          ...recordFor(v, me),
          userId,
          batches: { set: v.batches.map((id) => ({ id })) },
          documents: { create: documentRows(v, me.id).filter((d) => !have.has(d.url)) },
        },
      });
      return { before, roleBefore, roleAfter, password, payroll: accessAfter === accessBefore ? null : accessAfter };
    });

    const { before, roleBefore, roleAfter } = result;
    if (result.payroll !== null) {
      await createAuditLog({
        action: "PAYROLL_ACCESS",
        resource: "User",
        details: `${result.payroll ? "Gave" : "Took"} payroll access ${result.payroll ? "to" : "from"} ${v.fullNames} (${staffId})`,
        userId: me.id,
        recordId: staffId,
      });
    }
    const batchNames = await db.batches.findMany({ where: { id: { in: v.batches } }, select: { name: true }, orderBy: { name: "asc" } });
    touched();
    revalidatePath(`/staff/${staffId}`);
    if (roleBefore !== roleAfter) {
      await createAuditLog({
        action: "ROLE_CHANGE",
        resource: "User",
        details: !roleAfter
          ? `Turned off sign-in for ${v.fullNames} (${staffId})`
          : !roleBefore
            ? `Turned on sign-in for ${v.fullNames} (${staffId}) as ${ROLE_LABEL[roleAfter]}`
            : `Changed ${v.fullNames}'s role from ${ROLE_LABEL[roleBefore]} to ${ROLE_LABEL[roleAfter]}`,
        userId: me.id,
        recordId: staffId,
      });
    }
    const was = recordFor({ ...v, ...beforeValues(before) }, me);
    await createAuditLog({
      action: "UPDATE_STAFF",
      resource: "Staff",
      details: `Updated ${v.fullNames} (${staffId})`,
      userId: me.id,
      recordId: staffId,
      changes: diffFields(
        { ...plain(was), batches: before.batches.map((b) => b.name).sort(), documents: before.documents.map((d) => d.name).sort() },
        { ...plain(recordFor(v, me)), batches: batchNames.map((b) => b.name), documents: v.documents.map((d) => d.name || d.kind).sort() },
      ),
    });
    return { success: true as const, message: "Changes saved.", staffId, tempPassword: result.password };
  });
}

/** The saved record as form values, to diff against what was submitted. */
function beforeValues(s: Prisma.staffGetPayload<object>): Partial<StaffValues> {
  return {
    fullNames: s.fullNames,
    phoneNumber: s.phoneNumber,
    email: s.email ?? "",
    photo: s.photo ?? "",
    jobTitle: s.jobTitle ?? "",
    startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : "",
    nationalId: s.nationalId ?? "",
    kraPin: s.kraPin ?? "",
    nssfNumber: s.nssfNumber ?? "",
    shifNumber: s.shifNumber ?? "",
    salary: s.salary ? String(Number(s.salary)) : "",
    payBasis: s.payBasis ?? "",
    sessionRate: s.sessionRate ? String(Number(s.sessionRate)) : "",
    payMethod: (s.payMethod ?? "") as StaffValues["payMethod"],
    payAccount: s.payAccount ?? "",
    emergencyName: s.emergencyName ?? "",
    emergencyPhone: s.emergencyPhone ?? "",
    emergencyRelationship: s.emergencyRelationship ?? "",
  };
}

/** Dates and money as plain values for the log. */
const plain = (r: Partial<ReturnType<typeof recordOf>>) => ({
  ...r,
  startDate: r.startDate ? r.startDate.toISOString().slice(0, 10) : null,
  ...("salary" in r && { salary: r.salary ? Number(r.salary) : null }),
  ...("sessionRate" in r && { sessionRate: r.sessionRate ? Number(r.sessionRate) : null }),
});

async function findForAccess(staffId: string, me: Me) {
  const s = await db.staff.findUnique({ where: { staffId }, include: { user: true } });
  if (!s) throw new ActionError("That staff member no longer exists.");
  if (s.userId === me.id) throw new ActionError(SELF);
  if (s.user?.role === "SUPER_ADMIN" && !s.user.isArchived && me.role !== "SUPER_ADMIN") throw new ActionError(SUPER_ONLY);
  return s;
}

/** A new one-time password for someone who can sign in (forgotten, or never received). */
export async function resetStaffPassword(staffId: string) {
  return asRole("admin", async (me) => {
    const s = await findForAccess(staffId, me);
    if (s.isArchived || !s.user || s.user.isArchived) throw new ActionError("Turn on their sign-in first.");
    const password = await db.$transaction((tx) => setTempPassword(tx, s.user!.id));
    await createAuditLog({
      action: "PASSWORD_RESET",
      resource: "User",
      details: `Gave ${s.fullNames} (${staffId}) a new one-time password; they were signed out`,
      userId: me.id,
      recordId: staffId,
    });
    return { success: true as const, message: "New password ready.", tempPassword: password };
  });
}

/** Archive when someone leaves (their sign-in stops too), or restore them. */
export async function setStaffArchived(staffId: string, archived: boolean) {
  return asRole("admin", async (me) => {
    const s = await findForAccess(staffId, me);
    if (s.isArchived === archived) return { success: true as const, message: archived ? "Already archived." : "Already active." };
    await db.$transaction(async (tx) => {
      await tx.staff.update({ where: { id: s.id }, data: { isArchived: archived } });
      // Restoring leaves sign-in off; turning it back on gives a new password
      if (archived && s.userId) {
        await tx.user.update({ where: { id: s.userId }, data: { isArchived: true, payrollAccess: false } });
        await tx.session.deleteMany({ where: { userId: s.userId } });
      }
    });
    touched();
    revalidatePath(`/staff/${staffId}`);
    await createAuditLog({
      action: archived ? "ARCHIVE_STAFF" : "RESTORE_STAFF",
      resource: "Staff",
      details: archived
        ? `Archived ${s.fullNames} (${staffId})${s.userId ? "; they can no longer sign in" : ""}`
        : `Restored ${s.fullNames} (${staffId}); sign-in stays off until turned on`,
      userId: me.id,
      recordId: staffId,
    });
    return { success: true as const, message: archived ? `${s.fullNames} is archived.` : `${s.fullNames} is restored.` };
  });
}
