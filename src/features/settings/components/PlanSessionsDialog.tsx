"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/use-debounce";
import { academyToday, formatAcademy } from "@/lib/academy-time";
import { cn } from "@/lib/utils";
import {
  planBatchSessions,
  previewBatchSessions,
  type PlanPreview,
} from "../actions/batches";
import { planSchema } from "../schemas";

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const SKIP_LABEL: Record<string, string> = {
  "already planned": "Already planned",
  "coach busy": "Coach busy",
  "pitch busy": "Pitch taken",
};

type Session = PlanPreview["sessions"][number];

/** Monday of the session's week, in academy time, as a group label. */
const weekOf = (iso: string) => {
  const ymd = formatAcademy(iso, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .split("/")
    .reverse()
    .join("-");
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return `Week of ${formatAcademy(d, { day: "numeric", month: "short" })}`;
};

/** Expand the batch's timetable over a date range: preview first, then create. */
export function PlanSessionsDialog({
  open,
  onOpenChange,
  batch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: { id: string; name: string };
}) {
  const router = useRouter();
  const tomorrow = addDays(academyToday(), 1);
  const [range, setRange] = useState({
    from: tomorrow,
    to: addDays(tomorrow, 27),
  });
  const [result, setResult] = useState<{
    key: string;
    sessions?: Session[];
    error?: string;
  } | null>(null);
  const [saving, start] = useTransition();
  const [showSkipped, setShowSkipped] = useState(false);
  const debounced = useDebounce(range, 300);
  const key = `${debounced.from}|${debounced.to}`;
  const valid = planSchema.safeParse(debounced);

  useEffect(() => {
    if (!open || !valid.success) return;
    let live = true;
    previewBatchSessions(batch.id, {
      from: debounced.from,
      to: debounced.to,
    }).then((res) => {
      if (live)
        setResult({
          key,
          ...("sessions" in res
            ? { sessions: res.sessions }
            : { error: res.message }),
        });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the range
  }, [open, key, batch.id]);

  // While a new range loads, the last preview stays on screen, dimmed
  const loading = valid.success && result?.key !== key;
  const problem = valid.success
    ? result?.key === key
      ? (result.error ?? null)
      : null
    : valid.error.issues[0].message;
  const preview = problem ? null : (result?.sessions ?? null);

  const fresh = preview?.filter((s) => !s.skip) ?? [];
  const skipped = preview?.filter((s) => s.skip) ?? [];
  const why = Object.entries(
    skipped.reduce<Record<string, number>>(
      (n, s) => ({ ...n, [s.skip!]: (n[s.skip!] ?? 0) + 1 }),
      {},
    ),
  )
    .map(
      ([reason, n]) => `${n} ${(SKIP_LABEL[reason] ?? reason).toLowerCase()}`,
    )
    .join(" · ");
  const listed = showSkipped ? (preview ?? []) : fresh;
  const weeks = new Map<string, Session[]>();
  for (const s of listed)
    weeks.set(weekOf(s.date), [...(weeks.get(weekOf(s.date)) ?? []), s]);

  const create = () =>
    start(async () => {
      const res = await planBatchSessions(batch.id, range);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setRange({ from: tomorrow, to: addDays(tomorrow, 27) });
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[92svh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan {batch.name} sessions</DialogTitle>
          <DialogDescription>
            Adds a session for every timetable slot in these dates, with the
            batch&apos;s athletes on the register.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="plan-from">From</Label>
            <Input
              id="plan-from"
              type="date"
              min={academyToday()}
              value={range.from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan-to">To</Label>
            <Input
              id="plan-to"
              type="date"
              min={range.from}
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[4, 8, 12].map((w) => {
            const to = addDays(range.from, w * 7 - 1);
            return (
              <Button
                key={w}
                type="button"
                size="sm"
                variant={range.to === to ? "secondary" : "outline"}
                onClick={() => setRange((r) => ({ ...r, to }))}
              >
                {w} weeks
              </Button>
            );
          })}
        </div>

        <div className="min-h-40 flex-1 overflow-hidden rounded-lg border bg-card">
          {problem ? (
            <p className="p-4 text-sm text-destructive">{problem}</p>
          ) : !preview ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Working out the
              sessions…
            </p>
          ) : (
            <div
              className={cn(
                "flex h-full max-h-80 flex-col",
                loading && "opacity-60",
              )}
            >
              <div className="flex flex-col gap-1 border-b bg-muted/50 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <p className="text-sm">
                  <span className="font-display text-2xl font-bold">
                    {fresh.length}
                  </span>{" "}
                  new session{fresh.length === 1 ? "" : "s"}
                </p>
                {skipped.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSkipped((v) => !v)}
                    aria-expanded={showSkipped}
                    className="text-left text-xs text-muted-foreground underline-offset-2 sm:text-right hover:text-foreground hover:underline"
                  >
                    {showSkipped ? "Hide skipped" : `Skipping ${why}`}
                  </button>
                )}
              </div>
              {listed.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {preview.length
                    ? "Every timetable slot in these dates is already covered."
                    : "The timetable has no slots in these dates."}
                </p>
              ) : (
                <ul className="overflow-y-auto text-sm">
                  {[...weeks].map(([week, list]) => (
                    <li key={week}>
                      <p className="sticky top-0 bg-card px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {week}
                      </p>
                      <ul>
                        {list.map((s) => (
                          <li
                            key={s.date}
                            className={cn(
                              "flex items-center justify-between gap-3 px-4 py-1.5",
                              s.skip && "text-muted-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "tabular",
                                s.skip && "line-through",
                              )}
                            >
                              {formatAcademy(s.date, {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              ·{" "}
                              {formatAcademy(s.date, {
                                hour: "2-digit",
                                minute: "2-digit",
                                hourCycle: "h23",
                              })}
                              –
                              {formatAcademy(
                                new Date(
                                  new Date(s.date).getTime() +
                                    s.duration * 60_000,
                                ),
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hourCycle: "h23",
                                },
                              )}
                            </span>
                            {s.skip && (
                              <span className="text-xs">
                                {SKIP_LABEL[s.skip] ?? s.skip}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={create}
            disabled={saving || loading || !fresh.length}
          >
            {saving ? <Loader2 className="animate-spin" /> : <CalendarCheck2 />}
            {fresh.length
              ? `Plan ${fresh.length} session${fresh.length === 1 ? "" : "s"}`
              : "Nothing to plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
