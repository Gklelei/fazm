"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type RosterRow = { athleteId: string; name: string; status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | null; reason: string | null };

const STATUS = {
  PRESENT: { label: "Present", dot: "bg-success", text: "text-success" },
  LATE: { label: "Late", dot: "bg-warning", text: "text-warning-foreground dark:text-warning" },
  ABSENT: { label: "Absent", dot: "bg-destructive", text: "text-destructive" },
  EXCUSED: { label: "Excused", dot: "bg-info", text: "text-info" },
  NONE: { label: "Not marked", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
} as const;
type Key = keyof typeof STATUS;

/** The session's register as a table, with search and a filter by mark. */
export function AttendanceRoster({ rows }: { rows: RosterRow[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<Key | "ALL">("ALL");
  const counts = useMemo(() => {
    const c: Record<Key, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, NONE: 0 };
    for (const r of rows) c[r.status ?? "NONE"]++;
    return c;
  }, [rows]);
  const term = q.trim().toLowerCase();
  const matching = rows.filter((r) => (only === "ALL" || (r.status ?? "NONE") === only) && (!term || r.name.toLowerCase().includes(term) || r.athleteId.toLowerCase().includes(term)));

  const chip = (key: Key | "ALL", label: string, n: number, dot?: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={only === key}
      onClick={() => setOnly(only === key && key !== "ALL" ? "ALL" : key)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
        only === key ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {dot && <span className={cn("size-2 rounded-full", dot)} aria-hidden />}
      {label}
      <span className="tabular font-semibold">{n}</span>
    </button>
  );

  return (
    <div>
      <div className="space-y-3 border-b p-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search the register" placeholder="Search name or ID" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
          {chip("ALL", "All", rows.length)}
          {(Object.keys(STATUS) as Key[]).filter((k) => counts[k] > 0).map((k) => chip(k, STATUS[k].label, counts[k], STATUS[k].dot))}
        </div>
      </div>
      {matching.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No one matches.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-4">#</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matching.map((r, i) => {
                const s = STATUS[r.status ?? "NONE"];
                return (
                  <TableRow key={r.athleteId}>
                    <TableCell className="tabular pl-4 font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="min-w-48">
                      <Link href={`/players/user-profile/${r.athleteId}`} className="grid leading-tight hover:underline">
                        <span className="text-sm font-medium">{r.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{r.athleteId}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", s.text)} title={r.reason ?? undefined}>
                        <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
                        {r.reason && r.status !== "PRESENT" ? `${s.label} · ${r.reason}` : s.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
