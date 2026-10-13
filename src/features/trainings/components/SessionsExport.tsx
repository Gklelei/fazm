"use client";

import { format } from "date-fns";
import ExportDropdown from "@/components/shared/ExportDropdown";

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
        format(new Date(s.date), "dd MMM yyyy"),
        format(new Date(s.date), "HH:mm"),
        s.name,
        s.batch.name,
        s.location.name,
        s.coach.fullNames,
        String(s._count.athletes),
        String(s._count.attendances),
        s.status,
      ]}
    />
  );
}
