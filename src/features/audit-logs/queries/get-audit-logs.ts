import { db } from "@/lib/prisma";
import { FetchAuditLogsQuery } from "@/features/audit-logs/queries";

export const getAuditLogs = async () => {
  try {
    const logs = await db.auditLog.findMany(FetchAuditLogsQuery);
    return logs;
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }
};
