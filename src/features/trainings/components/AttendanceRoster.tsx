"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
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

/** The session's register: filter by mark, search by name or ID, athletes in a compact grid. */
export function AttendanceRoster({ rows }: { rows: RosterRow[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<Key | "ALL">("ALL");
  const [all, setAll] = useState(false);
  const counts = useMemo(() => {
    const c: Record<Key, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, NONE: 0 };
    for (const r of rows) c[r.status ?? "NONE"]++;
    return c;
  }, [rows]);
  const term = q.trim().toLowerCase();
  const matching = rows.filter((r) => (only === "ALL" || (r.status ?? "NONE") === only) && (!term || r.name.toLowerCase().includes(term) || r.athleteId.toLowerCase().includes(term)));

  // A long register opens short; searching or filtering shows every match
  const FIRST = 20;
  const narrowed = only !== "ALL" || !!term;
  const shown = narrowed || all ? matching : matching.slice(0, FIRST);

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
      {shown.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No one matches.</p>
      ) : (
        <ul className="grid gap-px bg-border sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((r) => {
            const s = STATUS[r.status ?? "NONE"];
            return (
              <li key={r.athleteId} className="bg-card">
                <Link href={`/players/user-profile/${r.athleteId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
                  <ProfileAvatar name={r.name} size={32} />
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">{r.athleteId}</span>
                  </span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-medium", s.text)} title={r.reason ?? undefined}>
                    <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
                    {r.reason && r.status !== "PRESENT" ? r.reason : s.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length < matching.length && (
        <div className="border-t p-3 text-center">
          <button type="button" onClick={() => setAll(true)} className="text-sm font-medium text-primary hover:underline">
            Show all {matching.length}
          </button>
        </div>
      )}
    </div>
  );
}
