import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkRole } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { ReportPage } from "@/features/reports/components/ReportPage";
import { parseRange } from "@/features/reports/lib/range";
import { getReport } from "@/features/reports/queries/get-report";

export const metadata: Metadata = { title: "Reports" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const authz = await checkRole([...ROLE_GROUPS.admin]);
  if (!authz.ok) redirect("/");

  const range = parseRange(await searchParams);
  return <ReportPage range={range} report={await getReport(range)} />;
}
