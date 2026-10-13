"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMinutes, format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, CheckCheck, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { UseUtilsContext } from "@/providers/UtilsContext";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { saveAttendance } from "../actions/mark-attendance";
import type { TrainingAttendanceType } from "../queries";

type Mark = { status: AttendanceStatus | null; reasonId: string | null };

/** The referee's colours: green present, yellow card late, red card absent. */
const OPTIONS: { value: AttendanceStatus; label: string; on: string }[] = [
  { value: "PRESENT", label: "Present", on: "bg-success text-success-foreground border-success" },
  { value: "LATE", label: "Late", on: "bg-warning text-warning-foreground border-warning" },
  { value: "ABSENT", label: "Absent", on: "bg-destructive text-white border-destructive" },
  { value: "EXCUSED", label: "Excused", on: "bg-info text-info-foreground border-info" },
];

export default function MarkAttendance({ data }: { data: TrainingAttendanceType }) {
  const router = useRouter();
  const reasons = UseUtilsContext().data?.attendance ?? [];
  const [saving, start] = useTransition();
  const [query, setQuery] = useState("");

  const saved = useMemo(
    () => new Map(data.attendances.map((a) => [a.athleteId, a])),
    [data.attendances],
  );
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    Object.fromEntries(
      data.athletes.map((a) => [
        a.athleteId,
        {
          status: saved.get(a.athleteId)?.status ?? null,
          reasonId: saved.get(a.athleteId)?.reasonId ?? null,
        },
      ]),
    ),
  );

  const set = (athleteId: string, patch: Partial<Mark>) =>
    setMarks((m) => ({ ...m, [athleteId]: { ...m[athleteId], ...patch } }));

  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, unmarked: 0 };
    for (const m of Object.values(marks)) c[m.status ?? "unmarked"]++;
    return c;
  }, [marks]);

  const dirty = data.athletes.some((a) => {
    const before = saved.get(a.athleteId);
    const now = marks[a.athleteId];
    return (before?.status ?? null) !== now.status || (before?.reasonId ?? null) !== now.reasonId;
  });

  const visible = data.athletes.filter((a) =>
    `${a.firstName} ${a.lastName} ${a.athleteId}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const markRestPresent = () =>
    setMarks((m) =>
      Object.fromEntries(
        Object.entries(m).map(([id, v]) => [id, v.status ? v : { status: "PRESENT", reasonId: null }]),
      ),
    );

  const save = () =>
    start(async () => {
      const input = Object.entries(marks)
        .filter(([, m]) => m.status)
        .map(([athleteId, m]) => ({
          athleteId,
          status: m.status as AttendanceStatus,
          reasonId: m.status === "PRESENT" ? null : m.reasonId,
        }));
      const res = await saveAttendance(input, data.id);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href={`/sessions/view/${data.id}`}>
          <ArrowLeft /> {data.name}
        </Link>
      </Button>

      <PageHeader
        title="Attendance"
        description={`${data.batch.name} · ${format(data.date, "EEE d MMM, HH:mm")}–${format(addMinutes(data.date, data.duration), "HH:mm")} · ${data.location.name}`}
      />

      {data.athletes.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-16 text-center">
          <p className="font-medium">No athletes are assigned to this session.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit the session to add its batch&apos;s athletes.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/sessions/edit/${data.id}`}>Edit session</Link>
          </Button>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Find athlete"
                placeholder="Find athlete"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={markRestPresent} disabled={!counts.unmarked}>
              <CheckCheck /> Mark the rest present
            </Button>
          </div>

          <ul className="divide-y">
            {visible.map((a) => {
              const m = marks[a.athleteId];
              const needsReason = m.status && m.status !== "PRESENT";
              const statusReasons = reasons.filter((r) => r.status === m.status);
              return (
                <li key={a.athleteId} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto_13rem] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar
                      name={`${a.firstName} ${a.lastName}`}
                      url={a.profilePIcture ?? ""}
                      size={36}
                    />
                    <span className="grid min-w-0 leading-tight">
                      <span className="truncate font-medium">
                        {a.firstName} {a.lastName}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{a.athleteId}</span>
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label={`Attendance for ${a.firstName}`}
                    className="grid grid-cols-4 gap-1.5 md:w-80"
                  >
                    {OPTIONS.map((o) => {
                      const on = m.status === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set(a.athleteId, { status: on ? null : o.value })}
                          className={cn(
                            "h-10 rounded-md border text-xs font-semibold sm:text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            on ? o.on : "bg-background text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="md:min-w-0">
                    {needsReason && statusReasons.length > 0 && (
                      <Select
                        value={m.reasonId ?? ""}
                        onValueChange={(v) => set(a.athleteId, { reasonId: v })}
                      >
                        <SelectTrigger className="w-full" aria-label="Reason">
                          <SelectValue placeholder="Reason (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusReasons.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {(r.label ?? "Other").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No athlete matches “{query}”.
              </li>
            )}
          </ul>
        </section>
      )}

      {data.athletes.length > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t bg-background/95 backdrop-blur md:-mx-6 md:-mb-6 lg:-mx-8 lg:-mb-8">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
            <p className="tabular flex flex-wrap gap-x-3 text-sm">
              <span className="text-success">{counts.PRESENT} present</span>
              <span className="text-warning-foreground dark:text-warning">{counts.LATE} late</span>
              <span className="text-destructive">{counts.ABSENT} absent</span>
              {counts.EXCUSED > 0 && <span className="text-info">{counts.EXCUSED} excused</span>}
              <span className="text-muted-foreground">{counts.unmarked} not marked</span>
            </p>
            <Button onClick={save} disabled={saving || !dirty || counts.unmarked === data.athletes.length}>
              {saving && <Loader2 className="animate-spin" />}
              Save attendance
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
