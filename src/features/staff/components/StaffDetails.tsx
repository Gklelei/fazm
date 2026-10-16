import Link from "next/link";
import { ArrowLeft, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { academyHHmm, formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { StaffRecord } from "../queries/detail";
import { STAFF_DOCUMENT_KINDS } from "../schemas";
import { SignInBadge } from "./SignInBadge";
import { StaffActions } from "./StaffActions";

type Session = { id: string; name: string; date: Date; status: string; batch: { name: string } };
type LogEntry = { id: string; details: string | null; createdAt: Date; user: { name: string } | null };

const day = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const when = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{children}</dd>
    </div>
  );
}

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
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

const Empty = ({ children }: { children: React.ReactNode }) => <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;

/** Label/value rows; empty values show a dash. */
function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className={cn("text-right font-medium", !v && "text-muted-foreground")}>{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function SessionList({ sessions }: { sessions: Session[] }) {
  return (
    <ul className="divide-y">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={`/sessions/view/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40">
            <span className="grid min-w-0 leading-tight">
              <span className="truncate font-medium">{s.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatAcademy(s.date, { weekday: "short", day: "numeric", month: "short" })} · {academyHHmm(s.date)} · {s.batch.name}
              </span>
            </span>
            <StatusBadge status={s.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StaffDetails({
  staff: s,
  upcoming,
  recent,
  history,
  activity,
  self,
}: {
  staff: StaffRecord;
  upcoming: Session[];
  recent: Session[];
  history: LogEntry[];
  activity: LogEntry[] | null;
  self: boolean;
}) {
  const signsIn = !!s.user && !s.user.isArchived;
  const coaches = s._count.trainings > 0 || s.batches.length > 0 || s.user?.role === "COACH";
  const kind = (k: string) => STAFF_DOCUMENT_KINDS.find((d) => d.value === k)?.label ?? k;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/staff">
          <ArrowLeft /> Staff
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <ProfileAvatar name={s.fullNames} url={s.photo ?? undefined} size={64} className="max-sm:hidden" />
            {s.fullNames}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {s.isArchived ? <StatusBadge status="ARCHIVED" tone="neutral">Archived</StatusBadge> : <SignInBadge user={s.user} />}
            {s.jobTitle && <span className="font-medium text-foreground">{s.jobTitle}</span>}
            <span className="font-mono text-xs">{s.staffId}</span>
          </span>
        }
        actions={
          <StaffActions
            staff={{ staffId: s.staffId, name: s.fullNames, email: s.user?.email ?? s.email ?? "", signsIn, self }}
            archived={s.isArchived}
          />
        }
      />

      {signsIn && s.user!.mustChangePassword && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          Hasn&apos;t signed in yet with their one-time password.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <Fact label="Phone">
          {s.phoneNumber ? (
            <a href={`tel:${s.phoneNumber}`} className="inline-flex items-center gap-1.5 hover:underline">
              <Phone className="size-3.5 text-muted-foreground" /> {formatPhone(s.phoneNumber)}
            </a>
          ) : (
            "—"
          )}
        </Fact>
        <Fact label="Email">{s.email ? <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a> : "—"}</Fact>
        <Fact label="Started">{s.startDate ? day(s.startDate) : "—"}</Fact>
        <Fact label="Batches">{s.batches.map((b) => b.name).join(", ") || "—"}</Fact>
      </dl>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          {coaches && (
            <Panel
              title="Sessions"
              aside={
                <span className="tabular text-sm text-muted-foreground">
                  {s._count.trainings} coached · {s._count.attendances} marked · {s._count.assessments} assessed
                </span>
              }
            >
              {upcoming.length === 0 && recent.length === 0 ? (
                <Empty>No sessions yet.</Empty>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <>
                      <p className="border-b bg-muted/30 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Coming up</p>
                      <SessionList sessions={upcoming} />
                    </>
                  )}
                  {recent.length > 0 && (
                    <>
                      <p className="border-y bg-muted/30 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Recent</p>
                      <SessionList sessions={recent} />
                    </>
                  )}
                </>
              )}
            </Panel>
          )}

          <Panel title="Documents">
            {s.documents.length === 0 ? (
              <Empty>No documents.</Empty>
            ) : (
              <ul className="divide-y">
                {s.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="grid min-w-0 flex-1 leading-tight">
                        <span className="truncate font-medium">{d.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {kind(d.kind)} · added {day(d.createdAt)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {activity && (
            <Panel
              title="Their activity"
              aside={
                <Link href={`/settings/audit-logs?person=${s.user!.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                  See all
                </Link>
              }
            >
              {activity.length === 0 ? (
                <Empty>Nothing yet.</Empty>
              ) : (
                <ol className="divide-y">
                  {activity.map((h) => (
                    <li key={h.id} className="px-4 py-2.5 text-sm">
                      <p>{h.details}</p>
                      <p className="text-muted-foreground">{when(h.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Panel title="Emergency contact">
            <Rows
              rows={[
                ["Name", s.emergencyName],
                ["Relationship", s.emergencyRelationship],
                ["Phone", s.emergencyPhone ? <a href={`tel:${s.emergencyPhone}`} className="hover:underline">{formatPhone(s.emergencyPhone)}</a> : null],
              ]}
            />
          </Panel>

          <Panel title="Pay and statutory">
            <Rows
              rows={[
                ["Monthly salary", s.salary ? formatCurrency(Number(s.salary)) : null],
                ["National ID", s.nationalId],
                ["KRA PIN", s.kraPin],
                ["NSSF", s.nssfNumber],
                ["SHIF", s.shifNumber],
              ]}
            />
          </Panel>

          <Panel title="History">
            {history.length === 0 ? (
              <Empty>No changes yet.</Empty>
            ) : (
              <ol className="divide-y">
                {history.map((h) => (
                  <li key={h.id} className="px-4 py-2.5 text-sm">
                    <p>{h.details}</p>
                    <p className="text-muted-foreground">
                      {h.user?.name ?? "System"} · {when(h.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
