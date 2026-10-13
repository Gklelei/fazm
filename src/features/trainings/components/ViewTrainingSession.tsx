import Link from "next/link";
import { addMinutes, format } from "date-fns";
import { ArrowLeft, ClipboardCheck, Pencil, Phone, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { GetAllTrainingSessionsByIdQueryType } from "@/features/assessments/queries";
import { SessionPdfButton } from "./SessionPdfButton";

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{children}</dd>
    </div>
  );
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export default function ViewTrainingSession({ data }: { data: GetAllTrainingSessionsByIdQueryType }) {
  const marks = new Map(data.attendances.map((a) => [a.athleteId, a]));
  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const a of data.attendances) counts[a.status]++;
  const unmarked = data.athletes.length - data.attendances.length;

  // Drills follow the coach's chosen order when one was saved
  const byId = new Map(data.drills.map((d) => [d.id, d]));
  const drills = data.drillOrder.length
    ? data.drillOrder.flatMap((id) => byId.get(id) ?? [])
    : data.drills;

  const names = new Map(data.athletes.map((a) => [a.athleteId, `${a.firstName} ${a.lastName}`]));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/sessions">
          <ArrowLeft /> Sessions
        </Link>
      </Button>

      <PageHeader
        title={data.name}
        description={data.description}
        actions={
          <>
            <SessionPdfButton data={data} />
            <Button variant="outline" asChild>
              <Link href={`/sessions/edit/${data.id}`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/assesments/${data.id}/mark`}>
                <ClipboardCheck /> Assess
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/sessions/attendance/mark/${data.id}`}>
                <UserCheck /> Take attendance
              </Link>
            </Button>
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-card p-4 md:grid-cols-5">
        <Fact label="When">
          {format(data.date, "EEE d MMM yyyy")}
        </Fact>
        <Fact label="Time">
          {format(data.date, "HH:mm")}–{format(addMinutes(data.date, data.duration), "HH:mm")}
        </Fact>
        <Fact label="Batch">{data.batch.name}</Fact>
        <Fact label="Location">{data.location.name}</Fact>
        <Fact label="Coach">
          <span className="flex items-center gap-2">
            {data.coach.fullNames}
            {data.coach.phoneNumber && (
              <a
                href={`tel:${data.coach.phoneNumber}`}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Call ${data.coach.fullNames}`}
              >
                <Phone className="size-3.5" />
              </a>
            )}
          </span>
        </Fact>
      </dl>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Panel
            title="Attendance"
            aside={<StatusBadge status={data.status} />}
          >
            <p className="tabular flex flex-wrap gap-x-4 gap-y-1 border-b px-4 py-2.5 text-sm">
              <span className="text-success">{counts.PRESENT} present</span>
              <span className="text-warning-foreground dark:text-warning">{counts.LATE} late</span>
              <span className="text-destructive">{counts.ABSENT} absent</span>
              {counts.EXCUSED > 0 && <span className="text-info">{counts.EXCUSED} excused</span>}
              {unmarked > 0 && <span className="text-muted-foreground">{unmarked} not marked</span>}
            </p>
            {data.athletes.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No athletes are assigned to this session.
              </p>
            ) : (
              <ul className="divide-y">
                {data.athletes.map((a) => {
                  const m = marks.get(a.athleteId);
                  return (
                    <li key={a.athleteId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <Link href={`/players/user-profile/${a.athleteId}`} className="grid min-w-0 leading-tight hover:underline">
                        <span className="truncate font-medium">
                          {a.firstName} {a.lastName}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{a.athleteId}</span>
                      </Link>
                      <span className="flex shrink-0 items-center gap-2">
                        {m?.reason?.label && m.status !== "PRESENT" && (
                          <span className="hidden text-xs text-muted-foreground sm:inline">
                            {sentence(m.reason.label)}
                          </span>
                        )}
                        <StatusBadge status={m?.status} tone={m ? undefined : "neutral"}>
                          {m ? undefined : "Not marked"}
                        </StatusBadge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Panel title="Drills">
            {drills.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No drills planned.{" "}
                <Link href={`/sessions/edit/${data.id}`} className="font-medium text-primary">
                  Add drills
                </Link>
              </p>
            ) : (
              <ol className="divide-y">
                {drills.map((d, i) => (
                  <li key={d.id} className="flex gap-3 px-4 py-3">
                    <span className="font-display tabular w-5 text-lg font-bold text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{d.name}</span>
                      {d.description && (
                        <span className="block text-sm text-muted-foreground">{d.description}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title="Assessments"
            aside={
              <Link href={`/assesments/${data.id}/mark`} className="text-sm text-muted-foreground hover:text-foreground">
                Assess
              </Link>
            }
          >
            {data.assessments.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No assessments yet.</p>
            ) : (
              <ul className="divide-y">
                {data.assessments.map((as) => (
                  <li key={as.id} className="space-y-1.5 px-4 py-3">
                    <p className="font-medium">{names.get(as.athleteId) ?? as.athleteId}</p>
                    <p className="flex flex-wrap gap-1">
                      {as.responses.map((r) => (
                        <span key={r.id} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {sentence(r.grade)}
                        </span>
                      ))}
                    </p>
                    {as.comment && <p className="text-sm text-muted-foreground">{as.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
