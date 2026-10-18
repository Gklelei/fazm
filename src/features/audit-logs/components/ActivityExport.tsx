"use client";

import ExportDropdown from "@/components/shared/ExportDropdown";
import { formatAcademy } from "@/lib/academy-time";
import { ROLE_LABEL } from "@/lib/roles";
import type { ActivityRow } from "../queries/list";

type Wire = Omit<ActivityRow, "createdAt"> & { createdAt: string };

/** Downloads everything matching the current filters (up to the export limit). */
export function ActivityExport({ query }: { query: string }) {
  return (
    <ExportDropdown<Wire>
      filename="Activity_log"
      headers={["When", "Person", "Role", "What happened", "Code", "Area", "Record", "Device", "IP address"]}
      rows={[]}
      fetchAllUrl={`/api/export?resource=activity${query ? `&${query}` : ""}`}
      mapRow={(r) => [
        formatAcademy(r.createdAt, { dateStyle: "medium", timeStyle: "medium", hourCycle: "h23" }),
        r.user?.name ?? "System",
        r.role ? (ROLE_LABEL[r.role as keyof typeof ROLE_LABEL] ?? r.role) : "",
        r.details ?? "",
        r.action,
        r.resource,
        r.athlete?.athleteId ?? r.recordId ?? "",
        r.userAgent ?? "",
        r.ip ?? "",
      ]}
    />
  );
}
