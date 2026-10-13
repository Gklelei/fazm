import { getAuditLogs } from "@/features/audit-logs/queries/get-audit-logs";
import AuditLogsTable from "@/features/audit-logs/components/AuditLogsTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const initialData = await getAuditLogs();

  return (
    <div className="w-full h-full p-4 md:p-8 space-y-6">
      <AuditLogsTable initialData={initialData} />
    </div>
  );
}
