import { db } from "@/lib/prisma";
import { FetchAuditLogsQuery } from "../Types";

export const getAuditLogs = async () => {
  try {
    const logs = await db.auditLog.findMany(FetchAuditLogsQuery);
    return logs;
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }
};
