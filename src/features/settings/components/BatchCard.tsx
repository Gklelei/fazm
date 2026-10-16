"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Clock, MapPin, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAcademy } from "@/lib/academy-time";
import { cn } from "@/lib/utils";
import type { SettingsData } from "../queries";
import { saveBatch, setBatchArchived } from "../actions/batches";
import { DAYS, type Day } from "../lib/plan-sessions";
import { ItemDialog } from "./ItemDialog";
import { PlanSessionsDialog } from "./PlanSessionsDialog";
import { RowMenu } from "./RowMenu";
import { TimetableSheet, type SlotDraft } from "./TimetableSheet";

type Batch = SettingsData["batches"][number];
type Option = { id: string; name: string };

/** One row per distinct time/pitch/coach, with the days it runs on. */
export function groupSlots(rows: Batch["slots"]) {
  const groups = new Map<
    string,
    {
      days: Day[];
      time: string;
      endTime: string | null;
      pitch: Batch["slots"][number]["location"];
      coach: Batch["slots"][number]["coach"];
    }
  >();
  for (const r of rows) {
    const key = [r.time, r.endTime, r.location?.id, r.coach?.staffId].join("|");
    const g = groups.get(key) ?? {
      days: [],
      time: r.time,
      endTime: r.endTime,
      pitch: r.location,
      coach: r.coach,
    };
    g.days.push(r.dayOfWeek as Day);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, days: DAYS.filter((d) => g.days.includes(d)) }))
    .sort(
      (a, b) =>
        DAYS.indexOf(a.days[0]) - DAYS.indexOf(b.days[0]) ||
        a.time.localeCompare(b.time),
    );
}

/** M T W T F S S, with the training days filled in. */
function WeekStrip({ days }: { days: Day[] }) {
  return (
    <span
      className="inline-flex gap-0.5"
      aria-label={days
        .map((d) => d.charAt(0) + d.slice(1).toLowerCase())
        .join(", ")}
    >
      {DAYS.map((d) => (
        <span
          key={d}
          aria-hidden
          className={cn(
            "grid size-6 place-items-center rounded text-[11px] font-semibold",
            days.includes(d)
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground/60",
          )}
        >
          {d.charAt(0)}
        </span>
      ))}
    </span>
  );
}

function PlanState({
  batch,
  hasTimetable,
}: {
  batch: Batch;
  hasTimetable: boolean;
}) {
  if (batch.nextSession && batch.plannedUntil) {
    return (
      <div className="flex items-start gap-2 text-sm">
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            batch.quietWeek ? "bg-warning" : "bg-success",
          )}
        />
        <div>
          <p className="font-medium">
            Next:{" "}
            {formatAcademy(batch.nextSession, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
            ,{" "}
            {formatAcademy(batch.nextSession, {
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {batch.upcoming} planned, up to{" "}
            {formatAcademy(batch.plannedUntil, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>
    );
  }
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          hasTimetable ? "bg-warning" : "bg-muted-foreground/40",
        )}
      />
      {hasTimetable ? "No sessions planned yet" : "No sessions planned"}
    </p>
  );
}

export function BatchCard({
  batch,
  pitches,
  coaches,
}: {
  batch: Batch;
  pitches: Option[];
  coaches: Option[];
}) {
  const [editing, setEditing] = useState(false);
  const [timetable, setTimetable] = useState(false);
  const [planning, setPlanning] = useState(false);
  const slots = groupSlots(batch.slots);
  const complete = slots.filter((s) => s.endTime && s.pitch && s.coach);

  const drafts: SlotDraft[] = slots.map((s) => ({
    days: s.days,
    time: s.time,
    endTime: s.endTime ?? "",
    trainingLocationsId: s.pitch && !s.pitch.voided ? s.pitch.id : "",
    staffId: s.coach?.staffId ?? "",
  }));

  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border bg-card",
        batch.archived && "bg-muted/40",
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl leading-none font-bold tracking-wide uppercase">
              {batch.name}
            </h3>
            <Link
              href={`/players?batch=${batch.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium hover:bg-accent"
              title={`See ${batch.name}'s athletes`}
            >
              <Users className="size-3" />
              <span className="tabular">{batch.athletes}</span> athlete
              {batch.athletes === 1 ? "" : "s"}
            </Link>
            {batch.archived && (
              <StatusBadge tone="neutral">Archived</StatusBadge>
            )}
          </div>
          {batch.description && (
            <p className="text-sm text-muted-foreground">{batch.description}</p>
          )}
        </div>
        <RowMenu
          name={batch.name}
          archived={batch.archived}
          editLabel="Rename"
          onEdit={() => setEditing(true)}
          setArchived={(to) => setBatchArchived(batch.id, to)}
        />
      </header>

      <div className="flex-1 border-t px-4 py-3">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Every week
        </p>
        {slots.length ? (
          <ul className="space-y-3">
            {slots.map((s) => (
              <li key={s.days.join() + s.time} className="grid gap-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <WeekStrip days={s.days} />
                  <span className="tabular inline-flex items-center gap-1 text-sm font-medium">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {s.time}
                    {s.endTime && `–${s.endTime}`}
                  </span>
                </div>
                <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      (!s.pitch || s.pitch.voided) &&
                        "text-warning-foreground dark:text-warning",
                    )}
                  >
                    <MapPin className="size-3" />
                    {s.pitch
                      ? `${s.pitch.name}${s.pitch.voided ? " (archived)" : ""}`
                      : "No pitch set"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      !s.coach && "text-warning-foreground dark:text-warning",
                    )}
                  >
                    <UserRound className="size-3" />
                    {s.coach?.fullNames ?? "No coach set"}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        ) : batch.archived ? (
          <p className="text-sm text-muted-foreground">No timetable.</p>
        ) : (
          <button
            type="button"
            onClick={() => setTimetable(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Clock className="size-4" /> Set weekly timetable
          </button>
        )}
      </div>

      {(slots.length > 0 || batch.nextSession) && (
        <footer className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <PlanState batch={batch} hasTimetable={complete.length > 0} />
          {!batch.archived && slots.length > 0 && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setTimetable(true)}
              >
                <Clock /> Edit timetable
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setPlanning(true)}
                disabled={!complete.length}
                title={complete.length ? undefined : "Set the timetable first"}
              >
                <CalendarPlus /> Plan sessions
              </Button>
            </div>
          )}
        </footer>
      )}

      <ItemDialog
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${batch.name}`}
        nameLabel="Batch name"
        withDescription="Description"
        initial={{ name: batch.name, description: batch.description ?? "" }}
        submitLabel="Save"
        submit={(v) =>
          saveBatch({ name: v.name, description: v.description }, batch.id)
        }
      />
      <TimetableSheet
        open={timetable}
        onOpenChange={setTimetable}
        batch={batch}
        initial={drafts}
        pitches={pitches}
        coaches={coaches}
      />
      <PlanSessionsDialog
        open={planning}
        onOpenChange={setPlanning}
        batch={batch}
      />
    </article>
  );
}
