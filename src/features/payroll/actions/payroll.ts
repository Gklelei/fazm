"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { ActionError, asRole } from "@/lib/action";
import { createAuditLog } from "@/lib/audit";
import { formatCurrency } from "@/lib/format";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { adjustmentsSchema, advanceSchema, deductionSchema, MONTH, type AdjustmentsInput, type AdvanceInput, type DeductionInput } from "../schemas";
import { monthLabel, monthRange, refreshPayroll } from "../lib/run";

const month = z.string().regex(MONTH, "Pick a month");
const done = (message: string) => {
  revalidatePath("/payroll", "layout");
  revalidatePath("/staff/[id]", "page");
  return { success: true as const, message };
};

/** Creates or updates a month's provisional payslips. */
export async function refreshMonth(input: string) {
  return asRole("finance", async (user) => {
    const m = month.parse(input);
    const res = await db.$transaction((tx) => refreshPayroll(m, tx), { timeout: 30_000 });
    if (res.locked) throw new ActionError(`${monthLabel(m)} is approved, so its payslips can't change.`);
    await createAuditLog({ action: "REFRESH_PAYROLL", resource: "Payroll", recordId: m, userId: user.id, details: `Worked out ${monthLabel(m)} payslips (${res.payslips})` });
    return done(`${monthLabel(m)}: ${res.payslips} payslips worked out`);
  });
}

/** The admin's allowances, one-off deductions and advance for one payslip. */
export async function adjustPayslip(payslipId: string, input: AdjustmentsInput) {
  return asRole("finance", async (user) => {
    const adjustments = adjustmentsSchema.parse(input);
    const slip = await db.payslip.findUnique({ where: { id: payslipId }, select: { status: true, run: { select: { month: true, status: true } }, staff: { select: { fullNames: true, staffId: true } } } });
    if (!slip) throw new ActionError("That payslip no longer exists. Refresh the page.");
    if (slip.run.status !== "PROVISIONAL") throw new ActionError("This month is approved, so its payslips can't change. Put corrections on next month's.");
    if (slip.status !== "PROVISIONAL") throw new ActionError("This payslip is approved. Reopen it first to change it.");
    await db.$transaction(
      async (tx) => {
        await tx.payslip.update({ where: { id: payslipId }, data: { adjustments } });
        await refreshPayroll(slip.run.month, tx);
      },
      { timeout: 30_000 },
    );
    await createAuditLog({
      action: "UPDATE_PAYSLIP",
      resource: "Payroll",
      recordId: slip.staff.staffId,
      userId: user.id,
      details: `Changed ${slip.staff.fullNames}'s ${monthLabel(slip.run.month)} payslip`,
    });
    return done("Payslip updated");
  });
}

/**
 * Locks the month once every payslip is approved, and posts its cost
 * (gross plus employer contributions) to expenses under Salaries.
 */
async function closeMonth(tx: Prisma.TransactionClient, runId: string, month: string, userId: string) {
  const slips = await tx.payslip.aggregate({ where: { runId }, _sum: { gross: true, employer: true }, _count: true });
  const cost = Number(slips._sum.gross ?? 0) + Number(slips._sum.employer ?? 0);
  const category =
    (await tx.expenseCategories.findFirst({ where: { name: { equals: "Salaries", mode: "insensitive" }, isArchived: false } })) ??
    (await tx.expenseCategories.create({ data: { name: "Salaries", status: "ACTIVE", description: "Payroll, posted when a month is approved" } }));
  const expense = await tx.expenses.create({
    data: { name: `Salaries ${monthLabel(month)}`, description: `${slips._count} payslips, with employer contributions`, amount: cost, date: new Date(monthRange(month).to.getTime() - 1), categoryId: category.id },
  });
  await tx.payrollRun.update({ where: { id: runId }, data: { status: "APPROVED", approvedById: userId, approvedAt: new Date(), expenseId: expense.id } });
  return cost;
}

const closed = (cost: number) => {
  revalidatePath("/expenses");
  lookupsChanged(LOOKUP.expenseCategories);
  return cost;
};

/** Approves every payslip still provisional, then locks the month. */
export async function approveMonth(input: string) {
  return asRole("admin", async (user) => {
    const m = month.parse(input);
    const total = await db.$transaction(
      async (tx) => {
        const res = await refreshPayroll(m, tx);
        if (res.locked) throw new ActionError(`${monthLabel(m)} is already approved.`);
        if (!(await tx.payslip.count({ where: { runId: res.run.id } }))) throw new ActionError("There are no payslips to approve. Set up pay profiles on the staff pages first.");
        await tx.payslip.updateMany({ where: { runId: res.run.id, status: "PROVISIONAL" }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } });
        return closeMonth(tx, res.run.id, m, user.id);
      },
      { timeout: 30_000 },
    );
    closed(total);
    await createAuditLog({ action: "APPROVE_PAYROLL", resource: "Payroll", recordId: m, userId: user.id, details: `Approved ${monthLabel(m)} payroll (${formatCurrency(total)} to expenses)` });
    return done(`${monthLabel(m)} approved`);
  });
}

/** Approves one payslip: worked out once more, then locked. The last one approves the month. */
export async function approvePayslip(payslipId: string) {
  return asRole("admin", async (user) => {
    const slip = await db.payslip.findUnique({ where: { id: payslipId }, select: { status: true, runId: true, run: { select: { month: true, status: true } }, staff: { select: { fullNames: true, staffId: true } } } });
    if (!slip) throw new ActionError("That payslip no longer exists. Refresh the page.");
    if (slip.run.status !== "PROVISIONAL" || slip.status !== "PROVISIONAL") throw new ActionError("That payslip is already approved.");
    const m = slip.run.month;
    const result = await db.$transaction(
      async (tx) => {
        await refreshPayroll(m, tx);
        const { count } = await tx.payslip.updateMany({ where: { id: payslipId, status: "PROVISIONAL" }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } });
        // Gone when worked out again (left, or pay profile removed)
        if (!count) throw new ActionError(`${slip.staff.fullNames} is no longer on payroll, so the payslip was removed. Refresh the page.`);
        const left = await tx.payslip.count({ where: { runId: slip.runId, status: "PROVISIONAL" } });
        return left ? null : closeMonth(tx, slip.runId, m, user.id);
      },
      { timeout: 30_000 },
    );
    await createAuditLog({ action: "APPROVE_PAYSLIP", resource: "Payroll", recordId: slip.staff.staffId, userId: user.id, details: `Approved ${slip.staff.fullNames}'s ${monthLabel(m)} payslip` });
    if (result == null) return done(`${slip.staff.fullNames}'s payslip approved`);
    closed(result);
    await createAuditLog({ action: "APPROVE_PAYROLL", resource: "Payroll", recordId: m, userId: user.id, details: `Approved ${monthLabel(m)} payroll (${formatCurrency(result)} to expenses)` });
    return done(`${slip.staff.fullNames}'s payslip approved · that was the last one, so ${monthLabel(m)} is approved`);
  });
}

/** Unlocks an approved payslip while its month is still open, so it can be changed. */
export async function reopenPayslip(payslipId: string) {
  return asRole("admin", async (user) => {
    const slip = await db.payslip.findUnique({ where: { id: payslipId }, select: { status: true, run: { select: { month: true, status: true } }, staff: { select: { fullNames: true, staffId: true } } } });
    if (!slip) throw new ActionError("That payslip no longer exists. Refresh the page.");
    if (slip.run.status !== "PROVISIONAL") throw new ActionError("This month is approved, so its payslips can't change. Put corrections on next month's.");
    if (slip.status === "PROVISIONAL") throw new ActionError("That payslip isn't approved.");
    await db.$transaction(
      async (tx) => {
        await tx.payslip.update({ where: { id: payslipId }, data: { status: "PROVISIONAL", approvedById: null, approvedAt: null } });
        await refreshPayroll(slip.run.month, tx);
      },
      { timeout: 30_000 },
    );
    await createAuditLog({ action: "REOPEN_PAYSLIP", resource: "Payroll", recordId: slip.staff.staffId, userId: user.id, details: `Reopened ${slip.staff.fullNames}'s ${monthLabel(slip.run.month)} payslip` });
    return done(`${slip.staff.fullNames}'s payslip reopened`);
  });
}

export async function markPaid(input: string) {
  return asRole("finance", async (user) => {
    const m = month.parse(input);
    const { count } = await db.payrollRun.updateMany({ where: { month: m, status: "APPROVED" }, data: { status: "PAID", paidAt: new Date() } });
    if (!count) throw new ActionError("Approve the month before marking it paid.");
    await createAuditLog({ action: "PAY_PAYROLL", resource: "Payroll", recordId: m, userId: user.id, details: `Marked ${monthLabel(m)} payroll as paid` });
    return done(`${monthLabel(m)} marked as paid`);
  });
}

/** An advance waits for an admin before it's taken back from pay. */
export async function recordAdvance(input: AdvanceInput) {
  return asRole("finance", async (user) => {
    const v = advanceSchema.parse(input);
    const staff = await db.staff.findFirst({ where: { id: v.staffId, isArchived: false }, select: { id: true, staffId: true, fullNames: true, payBasis: true } });
    if (!staff) throw new ActionError("Pick someone who still works here.");
    if (!staff.payBasis) throw new ActionError(`Set up ${staff.fullNames}'s pay on their staff page first, so the advance can be taken back.`);
    await db.salaryAdvance.create({
      data: { staffId: staff.id, date: new Date(`${v.date}T00:00:00Z`), amount: v.amount, method: v.method, reference: v.reference || null, reason: v.reason || null, months: v.months, recordedById: user.id },
    });
    await createAuditLog({
      action: "CREATE_ADVANCE",
      resource: "Payroll",
      recordId: staff.staffId,
      userId: user.id,
      details: `Recorded a ${formatCurrency(v.amount)} advance for ${staff.fullNames}, taken back over ${v.months} month${v.months > 1 ? "s" : ""}`,
    });
    return done("Advance recorded · waiting for an admin to approve it");
  });
}

export async function decideAdvance(id: string, approve: boolean) {
  return asRole("admin", async (user) => {
    const a = await db.salaryAdvance.findUnique({ where: { id }, select: { status: true, amount: true, staff: { select: { staffId: true, fullNames: true } } } });
    if (!a) throw new ActionError("That advance no longer exists. Refresh the page.");
    if (a.status !== "PENDING") throw new ActionError("That advance has already been decided.");
    await db.salaryAdvance.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", decidedById: user.id, decidedAt: new Date() } });
    await createAuditLog({
      action: approve ? "APPROVE_ADVANCE" : "REJECT_ADVANCE",
      resource: "Payroll",
      recordId: a.staff.staffId,
      userId: user.id,
      details: `${approve ? "Approved" : "Turned down"} ${a.staff.fullNames}'s ${formatCurrency(Number(a.amount))} advance`,
    });
    return done(approve ? "Advance approved" : "Advance turned down");
  });
}

export async function saveDeduction(input: DeductionInput) {
  return asRole("admin", async (user) => {
    const { id, ...v } = deductionSchema.parse(input);
    const data = { ...v, bands: v.kind === "BANDED" ? v.bands : undefined };
    if (id) await db.payrollDeduction.update({ where: { id }, data });
    else await db.payrollDeduction.create({ data: { ...data, position: await db.payrollDeduction.count() } });
    await createAuditLog({ action: id ? "UPDATE_DEDUCTION" : "CREATE_DEDUCTION", resource: "Payroll", recordId: id, userId: user.id, details: `${id ? "Changed" : "Added"} the ${v.name} deduction${v.enabled ? "" : " (off)"}` });
    revalidatePath("/settings");
    return done(`${v.name} saved`);
  });
}

export async function deleteDeduction(id: string) {
  return asRole("admin", async (user) => {
    const d = await db.payrollDeduction.findUnique({ where: { id }, select: { name: true, statutory: true } });
    if (!d) throw new ActionError("That deduction no longer exists. Refresh the page.");
    if (d.statutory) throw new ActionError(`${d.name} can be turned off but not removed.`);
    await db.payrollDeduction.delete({ where: { id } });
    await createAuditLog({ action: "DELETE_DEDUCTION", resource: "Payroll", recordId: id, userId: user.id, details: `Removed the ${d.name} deduction` });
    revalidatePath("/settings");
    return done(`${d.name} removed`);
  });
}
