import Link from "next/link";
import { addMinutes, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { MapPin, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { SessionRow } from "../queries/list-sessions";
import { SessionRowActions } from "./SessionRowActions";

const dayLabel = (d: Date) =>
  isToday(d)
    ? `Today · ${format(d, "EEEE d MMM")}`
    : isTomorrow(d)
      ? `Tomorrow · ${format(d, "EEEE d MMM")}`
      : isYesterday(d)
        ? `Yesterday · ${format(d, "EEEE d MMM")}`
        : format(d, d.getFullYear() === new Date().getFullYear() ? "EEEE d MMM" : "EEEE d MMM yyyy");

/** Attendance taken out of squad size, as a thin progress bar. */
function AttendanceMeter({ taken, squad }: { taken: number; squad: number }) {
  const pct = squad ? Math.min(100, Math.round((taken / squad) * 100)) : 0;
  return (
    <div className="grid w-28 gap-1">
      <span className="tabular text-xs text-muted-foreground">
        {taken ? `${taken}/${squad} marked` : `${squad} athletes`}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", pct === 100 ? "bg-success" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}

export function SessionsList({ rows }: { rows: SessionRow[] }) {
  const groups = new Map<string, SessionRow[]>();
  for (const r of rows) {
    const key = format(r.date, "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div>
      {[...groups.values()].map((day) => (
        <section key={day[0].id}>
          <h2
            className={cn(
              "sticky top-14 z-10 border-b bg-muted/80 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur",
              isToday(day[0].date) && "text-foreground",
            )}
          >
            {dayLabel(day[0].date)}
          </h2>
          <ul className="divide-y">
            {day.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[4.5rem_1fr_auto_auto_auto]"
              >
                <div className="leading-tight">
                  <p className="font-display text-xl font-bold tabular">{format(s.date, "HH:mm")}</p>
                  <p className="tabular text-xs text-muted-foreground">
                    to {format(addMinutes(s.date, s.duration), "HH:mm")}
                  </p>
                </div>
                <Link href={`/sessions/view/${s.id}`} className="group min-w-0">
                  <p className="truncate font-medium group-hover:underline">{s.name}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{s.batch.name}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {s.location.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="size-3" /> {s.coach.fullNames}
                    </span>
                  </p>
                </Link>
                <div className="hidden sm:block">
                  <AttendanceMeter taken={s._count.attendances} squad={s._count.athletes} />
                </div>
                <div className="hidden sm:block">
                  <StatusBadge status={s.status} />
                </div>
                <SessionRowActions id={s.id} name={s.name} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
