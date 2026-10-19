import "server-only";
import { db } from "@/lib/prisma";
import type { Line } from "../lib/calculate";
import type { Adjustments } from "../lib/run";

const n = (d: unknown) => Number(d ?? 0);

/** A month's run and its payslips, newest staff names A–Z. */
export async function payrollMonth(month: string) {
  const run = await db.payrollRun.findUnique({
    where: { month },
    include: {
      payslips: {
        orderBy: { staff: { fullNames: "asc" } },
        include: {
          staff: { select: { id: true, staffId: true, fullNames: true, jobTitle: true, payMethod: true, payAccount: true } },
          recoveries: { select: { amount: true } },
        },
      },
    },
  });
  if (!run) return null;
  return {
    month: run.month,
    status: run.status,
    approvedAt: run.approvedAt?.toISOString() ?? null,
    paidAt: run.paidAt?.toISOString() ?? null,
    payslips: run.payslips.map((p) => ({
      id: p.id,
      staff: p.staff,
      basis: p.basis,
      sessions: p.sessions,
      gross: n(p.gross),
      deductions: n(p.deductions),
      net: n(p.net),
      employer: n(p.employer),
      advance: p.recoveries.reduce((s, r) => s + n(r.amount), 0),
      lines: p.lines as Line[],
      adjustments: p.adjustments as Adjustments,
      overCap: p.overCap,
    })),
  };
}
export type PayrollMonth = NonNullable<Awaited<ReturnType<typeof payrollMonth>>>;
export type PayslipRow = PayrollMonth["payslips"][number];

export const payrollMonths = () => db.payrollRun.findMany({ select: { month: true, status: true }, orderBy: { month: "desc" }, take: 36 });

/** Advances waiting for an admin, and everyone still paying one back. */
export async function advancesBoard() {
  const rows = await db.salaryAdvance.findMany({
    where: { status: { in: ["PENDING", "APPROVED"] } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      staff: { select: { id: true, staffId: true, fullNames: true } },
      recoveries: { where: { payslip: { run: { status: { not: "PROVISIONAL" } } } }, select: { amount: true } },
    },
    take: 300,
  });
  return rows
    .map((a) => {
      const recovered = a.recoveries.reduce((s, r) => s + n(r.amount), 0);
      return {
        id: a.id,
        staff: a.staff,
        date: a.date.toISOString().slice(0, 10),
        amount: n(a.amount),
        method: a.method,
        reference: a.reference,
        reason: a.reason,
        months: a.months,
        status: a.status,
        recovered,
        outstanding: n(a.amount) - recovered,
      };
    })
    .filter((a) => a.status === "PENDING" || a.outstanding > 0.004);
}
export type AdvanceRow = Awaited<ReturnType<typeof advancesBoard>>[number];

/** People an advance can be recorded for. */
export const payableStaff = () =>
  db.staff.findMany({ where: { isArchived: false, payBasis: { not: null } }, select: { id: true, fullNames: true, staffId: true }, orderBy: { fullNames: "asc" } });

/** A person's payslips, newest first; provisional ones only once worked out. */
export const payslipsOf = async (staffId: string) =>
  (
    await db.payslip.findMany({
      where: { staffId },
      select: { id: true, net: true, gross: true, run: { select: { month: true, status: true } } },
      orderBy: { run: { month: "desc" } },
      take: 24,
    })
  ).map((p) => ({ id: p.id, month: p.run.month, status: p.run.status, gross: n(p.gross), net: n(p.net) }));
export type PayslipSummary = Awaited<ReturnType<typeof payslipsOf>>[number];

export async function deductionSettings() {
  const [rows, staff] = await Promise.all([db.payrollDeduction.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }), payableStaff()]);
  return {
    staff,
    rows: rows.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind as "PERCENT_GROSS" | "PERCENT_BASIC" | "FIXED" | "BANDED",
      value: n(d.value),
      bands: (d.bands as { upTo: number | null; rate: number }[] | null) ?? [],
      relief: n(d.relief),
      minimum: d.minimum == null ? null : n(d.minimum),
      maximum: d.maximum == null ? null : n(d.maximum),
      beforeTax: d.beforeTax,
      employerPercent: n(d.employerPercent),
      statutory: d.statutory,
      enabled: d.enabled,
      staffIds: d.staffIds,
      setUp: d.enabled || d.updatedAt.getTime() - d.createdAt.getTime() > 1000,
    })),
  };
}
export type DeductionRow = Awaited<ReturnType<typeof deductionSettings>>["rows"][number];
