import type { Metadata } from "next";
import { MONTH } from "@/features/payroll/schemas";
import { currentMonth } from "@/features/payroll/lib/run";
import {
  advancesBoard,
  payableStaff,
  payrollMonth,
  payrollMonths,
} from "@/features/payroll/queries";
import { PayrollPage } from "@/features/payroll/components/PayrollPage";

export const metadata: Metadata = { title: "Payroll" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const now = currentMonth();
  const [y, m] = now.split("-").map(Number);
  const last =
    m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const month = sp.month && MONTH.test(sp.month) ? sp.month : now;
  const [data, runs, advances, staff] = await Promise.all([
    payrollMonth(month),
    payrollMonths(),
    advancesBoard(),
    payableStaff(),
  ]);
  const months = [...new Set([now, last, month, ...runs.map((r) => r.month)])]
    .sort()
    .reverse();
  return (
    <PayrollPage
      month={month}
      months={months}
      data={data}
      advances={advances}
      staff={staff}
      tab={sp.tab === "advances" ? "advances" : "payslips"}
    />
  );
}
