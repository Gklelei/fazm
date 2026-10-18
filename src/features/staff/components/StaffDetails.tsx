import Link from "next/link";
import { Activity, ArrowLeft, CalendarDays, FileText, History as HistoryIcon, IdCard, Landmark, Mail, Phone, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { academyHHmm, formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/roles";
import type { StaffRecord } from "../queries/detail";
import { STAFF_DOCUMENT_KINDS } from "../schemas";
import { StaffActions } from "./StaffActions";

type Session = { id: string; name: string; date: Date; status: string; batch: { name: string } };
type LogEntry = { id: string; details: string | null; createdAt: Date; user: { name: string } | null };

const day = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const when = (d: Date) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function RailCard({ icon: Icon, title, aside, children }: { icon: React.ComponentType<{ className?: string }>; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {title}
        {aside && <span className="ml-auto text-sm font-normal">{aside}</span>}
      </h2>
      {children}
    </section>
  );
}

const None = ({ children }: { children: React.ReactNode }) => <p className="px-4 pb-4 text-sm text-muted-foreground">{children}</p>;

function SessionList({ sessions }: { sessions: Session[] }) {
  return (
    <ul className="divide-y">
      {sessions.map((x) => (
        <li key={x.id}>
          <Link href={`/sessions/view/${x.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
            <span className="grid w-11 shrink-0 place-items-center rounded-lg bg-muted py-1 leading-none">
              <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase">{formatAcademy(x.date, { month: "short" })}</span>
              <span className="tabular font-display text-lg font-bold">{formatAcademy(x.date, { day: "numeric" })}</span>
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-medium">{x.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatAcademy(x.date, { weekday: "short" })} · {academyHHmm(x.date)} · {x.batch.name}
              </span>
            </span>
            <StatusBadge status={x.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A labelled value; empty shows a dash. */
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm font-medium", !children && "text-muted-foreground")}>{children || "—"}</dd>
    </div>
  );
}

export function StaffDetails({
  staff: s,
  stats,
  upcoming,
  recent,
  history,
  activity,
  self,
}: {
  staff: StaffRecord;
  stats: { sessions: number; upcoming: number; completed: number; hours: number; averageMinutes: number };
  upcoming: Session[];
  recent: Session[];
  history: LogEntry[];
  activity: LogEntry[] | null;
  self: boolean;
}) {
  const signsIn = !!s.user && !s.user.isArchived;
  // Coaching numbers only for people who coach
  const coaches = stats.sessions > 0 || (s.user?.role === "COACH" && !s.user.isArchived);
  const kind = (k: string) => STAFF_DOCUMENT_KINDS.find((d) => d.value === k)?.label ?? k;
  const pastSessions = stats.sessions - stats.upcoming;
  const completion = pastSessions > 0 ? Math.round((stats.completed / pastSessions) * 100) : null;
  const hasEmergency = s.emergencyName || s.emergencyPhone;
  const hasPay = s.salary || s.nationalId || s.kraPin || s.nssfNumber || s.shifNumber;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/staff">
          <ArrowLeft /> Staff
        </Link>
      </Button>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2">
          <section className="overflow-hidden rounded-xl bg-brand-navy text-white shadow-sm dark:ring-1 dark:ring-white/10">
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <ProfileAvatar name={s.fullNames} url={s.photo ?? undefined} size={64} className="ring-2 ring-brand-gold" />
                <div className="min-w-0">
                  <h1 className="font-display text-2xl leading-tight font-bold">{s.fullNames}</h1>
                  <p className="text-sm text-white/70">{s.jobTitle || (s.isArchived ? "Archived" : "Staff")}</p>
                  <p className="font-mono text-xs text-white/50">{s.staffId}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.isArchived ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">Archived</span>
                ) : (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-brand-navy">
                    {signsIn ? ROLE_LABEL[s.user!.role] : "No sign-in"}
                  </span>
                )}
                {s.batches.map((b) => (
                  <span key={b.id} className="rounded-md bg-brand-gold px-2 py-0.5 text-xs font-bold text-brand-navy">
                    {b.name}
                  </span>
                ))}
              </div>
              <dl className="grid gap-2 text-sm">
                {s.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-brand-gold" />
                    <dd>
                      <a href={`tel:${s.phoneNumber}`} className="hover:underline">
                        {formatPhone(s.phoneNumber)}
                      </a>
                    </dd>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-brand-gold" />
                    <dd className="truncate">
                      <a href={`mailto:${s.email}`} className="hover:underline">
                        {s.email}
                      </a>
                    </dd>
                  </div>
                )}
                {s.startDate && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-brand-gold" />
                    <dd>Started {day(s.startDate)}</dd>
                  </div>
                )}
              </dl>
              {signsIn && s.user!.mustChangePassword && (
                <p className="rounded-md bg-brand-gold/15 px-3 py-2 text-sm text-brand-gold">Hasn&apos;t signed in yet with their one-time password.</p>
              )}
            </div>
            <div className="border-t border-white/10 bg-white/5 p-4">
              <StaffActions staff={{ staffId: s.staffId, name: s.fullNames, email: s.user?.email ?? s.email ?? "", signsIn, self }} archived={s.isArchived} />
            </div>
          </section>

          <RailCard icon={FileText} title="Documents">
            {s.documents.length === 0 ? (
              <None>None uploaded.</None>
            ) : (
              <ul className="divide-y border-t">
                {s.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="grid min-w-0 leading-tight">
                        <span className="truncate font-medium">{d.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {kind(d.kind)} · {day(d.createdAt)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </RailCard>

          <RailCard icon={HistoryIcon} title="History">
            {history.length === 0 ? (
              <None>No changes yet.</None>
            ) : (
              <ol className="space-y-3 px-4 pb-4">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-primary/25 pl-3 text-sm">
                    <p>{h.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.user?.name ?? "System"} · {when(h.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </RailCard>
        </aside>

        <div className="min-w-0 space-y-4 lg:order-1">
          {coaches && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Sessions", value: stats.sessions, note: `${stats.upcoming} coming up` },
                { label: "Completed", value: completion == null ? "—" : `${completion}%`, note: `${stats.completed} of ${pastSessions} past`, gold: true },
                { label: "Hours coached", value: stats.hours, note: stats.averageMinutes ? `${stats.averageMinutes} min a session` : "—" },
                { label: "Athletes marked", value: s._count.attendances, note: `${s._count.assessments} assessed` },
              ].map((t) => (
                <div key={t.label} className={cn("rounded-xl border bg-card p-4", t.gold && "border-brand-gold/50 bg-brand-gold/10")}>
                  <dt className="text-xs font-medium text-muted-foreground">{t.label}</dt>
                  <dd className="tabular mt-1 font-display text-3xl leading-none font-bold">{t.value}</dd>
                  <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>
                </div>
              ))}
            </dl>
          )}

          {coaches && (
            <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <h2 className="flex items-center gap-2 border-b px-4 py-3 text-base font-semibold">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <CalendarDays className="size-4" />
                </span>
                Sessions
                {stats.sessions > 0 && (
                  <Link href={`/sessions?search=${encodeURIComponent(s.fullNames)}`} className="ml-auto text-sm font-normal text-primary hover:underline">
                    See all {stats.sessions}
                  </Link>
                )}
              </h2>
              {upcoming.length === 0 && recent.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No sessions yet.</p>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <>
                      <p className="bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">Coming up</p>
                      <SessionList sessions={upcoming} />
                    </>
                  )}
                  {recent.length > 0 && (
                    <>
                      <p className="border-t bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">Recent</p>
                      <SessionList sessions={recent} />
                    </>
                  )}
                </>
              )}
            </section>
          )}

          <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <h2 className="flex items-center gap-2 border-b px-4 py-3 text-base font-semibold">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                <IdCard className="size-4" />
              </span>
              Details
            </h2>
            <div className="grid gap-6 p-4 sm:grid-cols-2 sm:p-5">
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Siren className="size-4 text-muted-foreground" /> Emergency contact
                </p>
                {hasEmergency ? (
                  <dl className="grid grid-cols-2 gap-3">
                    <Item label="Name">{s.emergencyName}</Item>
                    <Item label="Relationship">{s.emergencyRelationship}</Item>
                    <Item label="Phone">
                      {s.emergencyPhone && (
                        <a href={`tel:${s.emergencyPhone}`} className="hover:underline">
                          {formatPhone(s.emergencyPhone)}
                        </a>
                      )}
                    </Item>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Not added.</p>
                )}
              </div>
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Landmark className="size-4 text-muted-foreground" /> Pay and statutory
                </p>
                {hasPay ? (
                  <dl className="grid grid-cols-2 gap-3">
                    <Item label="Monthly salary">{s.salary ? formatCurrency(Number(s.salary)) : null}</Item>
                    <Item label="National ID">{s.nationalId}</Item>
                    <Item label="KRA PIN">{s.kraPin}</Item>
                    <Item label="NSSF">{s.nssfNumber}</Item>
                    <Item label="SHIF">{s.shifNumber}</Item>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Not added.</p>
                )}
              </div>
            </div>
          </section>

          {activity && (
            <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <h2 className="flex items-center gap-2 border-b px-4 py-3 text-base font-semibold">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <Activity className="size-4" />
                </span>
                Their activity
                <Link href={`/settings/audit-logs?person=${s.user!.id}`} className="ml-auto text-sm font-normal text-primary hover:underline">
                  See all
                </Link>
              </h2>
              {activity.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <ol className="divide-y">
                  {activity.map((h) => (
                    <li key={h.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
                      <span>{h.details}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{when(h.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
