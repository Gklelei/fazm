import { getAuditLogs } from "@/Modules/Settings/AuditLogs/api/getAuditLogs";
import AuditLogsTable from "@/Modules/Settings/AuditLogs/ui/AuditLogsTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const initialData = await getAuditLogs();

  return (
    <div className="w-full h-full p-4 md:p-8 space-y-6">
      <AuditLogsTable initialData={initialData as any} />
    </div>
  );
}
