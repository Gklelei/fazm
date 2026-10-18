"use client";

import ExportDropdown from "@/components/shared/ExportDropdown";
import { statusLabel } from "@/components/shared/StatusBadge";
import { academyHHmm, formatAcademy } from "@/lib/academy-time";

type ExportSession = {
  name: string;
  date: string;
  duration: number;
  status: string;
  batch: { name: string };
  location: { name: string };
  coach: { fullNames: string };
  _count: { athletes: number; attendances: number };
};

export function SessionsExport() {
  return (
    <ExportDropdown<ExportSession>
      filename="Training sessions"
      headers={["Date", "Time", "Session", "Batch", "Location", "Coach", "Athletes", "Marked", "Status"]}
      rows={[]}
      fetchAllUrl="/api/export?resource=sessions"
      mapRow={(s) => [
        formatAcademy(s.date, { day: "2-digit", month: "short", year: "numeric" }),
        academyHHmm(s.date),
        s.name,
        s.batch.name,
        s.location.name,
        s.coach.fullNames,
        String(s._count.athletes),
        String(s._count.attendances),
        statusLabel(s.status),
      ]}
    />
  );
}
