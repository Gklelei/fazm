import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardCheck, Clock, ListOrdered, MapPin, Pencil, Phone, UserCheck, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { GetAllTrainingSessionsByIdQueryType } from "@/features/assessments/queries";
import { SessionPdfButton } from "./SessionPdfButton";
import { AttendanceRoster } from "./AttendanceRoster";
import { academyHHmm, formatAcademy } from "@/lib/academy-time";
import { gradeLabel, gradeScore } from "@/features/assessments/lib/grades";

/** "Average Good · 2 measured" from one assessment's responses. */
function assessmentSummary(responses: { grade: string | null; value: unknown }[]) {
  const scores = responses.flatMap((r) => (r.grade ? [gradeScore(r.grade)!] : []));
  const measured = responses.length - scores.length;
  return [scores.length && `Average ${gradeLabel(scores.reduce((a, b) => a + b, 0) / scores.length)}`, measured && `${measured} measured`].filter(Boolean).join(" · ") || "Comment only";
}

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");

function RailCard({ icon: Icon, title, aside, children }: { icon: React.ComponentType<{ className?: string }>; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
        {aside && <span className="ml-auto font-normal">{aside}</span>}
      </h2>
      {children}
    </section>
  );
}

const SEGMENTS = [
  { key: "PRESENT", className: "bg-success", label: "present" },
  { key: "LATE", className: "bg-warning", label: "late" },
  { key: "ABSENT", className: "bg-destructive", label: "absent" },
  { key: "EXCUSED", className: "bg-info", label: "excused" },
] as const;

export default function ViewTrainingSession({ data }: { data: GetAllTrainingSessionsByIdQueryType }) {
  const marks = new Map(data.attendances.map((a) => [a.athleteId, a]));
  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const a of data.attendances) counts[a.status]++;
  const total = data.athletes.length;
  const unmarked = total - data.attendances.length;

  // Drills follow the coach's chosen order when one was saved
  const byId = new Map(data.drills.map((d) => [d.id, d]));
  const drills = data.drillOrder.length ? data.drillOrder.flatMap((id) => byId.get(id) ?? []) : data.drills;
  const names = new Map(data.athletes.map((a) => [a.athleteId, `${a.firstName} ${a.lastName}`]));
  const end = new Date(new Date(data.date).getTime() + data.duration * 60_000);
  const length = data.duration % 60 ? `${Math.floor(data.duration / 60) ? `${Math.floor(data.duration / 60)} h ` : ""}${data.duration % 60} min` : `${data.duration / 60} h`;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/sessions">
          <ArrowLeft /> Sessions
        </Link>
      </Button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2">
          <section className="overflow-hidden rounded-xl bg-brand-navy text-white shadow-sm dark:ring-1 dark:ring-white/10">
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md bg-brand-gold px-2 py-0.5 text-xs font-bold text-brand-navy">{data.batch.name}</span>
                <StatusBadge status={data.status} className="border-transparent bg-white text-brand-navy dark:text-brand-navy" />
              </div>
              <div>
                <h1 className="font-display text-2xl leading-tight font-bold">{data.name}</h1>
                {data.description && <p className="mt-1 text-sm text-white/70">{data.description}</p>}
              </div>
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-brand-gold" />
                  <dd className="font-medium">{formatAcademy(data.date, { weekday: "long", day: "numeric", month: "long" })}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-brand-gold" />
                  <dd>
                    {academyHHmm(data.date)}–{academyHHmm(end)} <span className="text-white/60">· {length}</span>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-brand-gold" />
                  <dd>{data.location.name}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <UserRound className="size-4 text-brand-gold" />
                  <dd className="flex items-center gap-2">
                    {data.coach.fullNames}
                    {data.coach.phoneNumber && (
                      <a href={`tel:${data.coach.phoneNumber}`} className="text-white/60 hover:text-white" aria-label={`Call ${data.coach.fullNames}`}>
                        <Phone className="size-3.5" />
                      </a>
                    )}
                  </dd>
                </div>
              </dl>
              {total > 0 && (
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="tabular font-display text-3xl font-bold text-brand-gold">
                      {counts.PRESENT + counts.LATE}
                      <span className="text-lg text-white/60">/{total}</span>
                    </p>
                    <p className="text-sm text-white/70">{unmarked === total ? "Not marked yet" : "came"}</p>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
                    {SEGMENTS.map((s) => (counts[s.key] ? <div key={s.key} className={s.className} style={{ width: `${(counts[s.key] / total) * 100}%` }} /> : null))}
                  </div>
                  <p className="tabular mt-1.5 text-xs text-white/70">
                    {SEGMENTS.filter((s) => counts[s.key])
                      .map((s) => `${counts[s.key]} ${s.label}`)
                      .concat(unmarked ? [`${unmarked} not marked`] : [])
                      .join(" · ")}
                  </p>
                </div>
              )}
            </div>
            <div className="grid gap-2 border-t border-white/10 bg-white/5 p-4">
              <Button asChild className="h-11 w-full bg-brand-gold text-brand-navy hover:bg-brand-gold/90">
                <Link href={`/sessions/attendance/mark/${data.id}`}>
                  <UserCheck /> Take attendance
                </Link>
              </Button>
              <div className="flex gap-2 [&>*]:flex-1">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/assesments/${data.id}/mark`}>
                    <ClipboardCheck /> Assess
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/sessions/edit/${data.id}`}>
                    <Pencil /> Edit
                  </Link>
                </Button>
                <SessionPdfButton data={data} />
              </div>
            </div>
          </section>

          <RailCard
            icon={ListOrdered}
            title="Drills"
            aside={
              !drills.length && (
                <Link href={`/sessions/edit/${data.id}`} className="text-primary hover:underline">
                  Add drills
                </Link>
              )
            }
          >
            {drills.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">None planned.</p>
            ) : (
              <ol className="space-y-2.5 px-4 pb-4">
                {drills.map((d, i) => (
                  <li key={d.id} className="flex gap-3 text-sm">
                    <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{d.name}</span>
                      {d.description && <span className="block text-muted-foreground">{d.description}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </RailCard>

          <RailCard
            icon={ClipboardCheck}
            title="Assessments"
            aside={
              <Link href={`/assesments/${data.id}/mark`} className="text-primary hover:underline">
                Assess
              </Link>
            }
          >
            {data.assessments.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y border-t">
                {data.assessments.map((as) => (
                  <li key={as.id} className="space-y-0.5 px-4 py-2.5 text-sm">
                    <p className="font-medium">{names.get(as.athleteId) ?? as.athleteId}</p>
                    <p className="text-muted-foreground">{assessmentSummary(as.responses)}</p>
                    {as.comment && <p className="text-muted-foreground">{as.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </RailCard>
        </aside>

        <section className="overflow-hidden rounded-xl border bg-card shadow-xs lg:order-1">
          <h2 className="flex items-center gap-2 border-b px-4 py-3 text-base font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
              <Users className="size-4" />
            </span>
            Register
            <span className="tabular ml-auto text-sm font-normal text-muted-foreground">{total} athletes</span>
          </h2>
          {total === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No athletes are on this session&apos;s register.</p>
          ) : (
            <AttendanceRoster
              rows={data.athletes.map((a) => {
                const m = marks.get(a.athleteId);
                return {
                  athleteId: a.athleteId,
                  name: `${a.firstName} ${a.lastName}`,
                  status: m?.status ?? null,
                  reason: m?.reason?.label ? sentence(m.reason.label) : null,
                };
              })}
            />
          )}
        </section>
      </div>
    </div>
  );
}
