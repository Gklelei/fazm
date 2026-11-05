import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkRole } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { ReportPage } from "@/features/reports/components/ReportPage";
import { parseRange } from "@/features/reports/lib/range";
import { getReport } from "@/features/reports/queries/get-report";
import { programmesShown, selectedProgrammeId } from "@/lib/programme";

export const metadata: Metadata = { title: "Reports" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) redirect("/");

  const range = parseRange(await searchParams);
  const [report, shown] = await Promise.all([getReport(range, new Date(), await selectedProgrammeId()), programmesShown()]);
  // No "By programme" table while programmes are hidden from this user
  if (!shown) report.programmes.rows = [];
  return <ReportPage range={range} report={report} />;
}
