import Link from "next/link";
import { format, isToday } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  Receipt,
  UserPlus,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Panel } from "@/components/shared/Panel";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { METHOD_LABEL } from "@/features/finance/lib/methods";
import type { DashboardData } from "../queries/get-dashboard";
import { IncomeChart } from "./IncomeChart";

const SHOWN_SESSIONS = 6;
const SHOWN_BATCHES = 8;

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** One "go and deal with this" item in the attention strip. */
function Todo({
  href,
  icon: Icon,
  title,
  note,
  tone,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  note: string;
  tone: "danger" | "warning" | "info";
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md",
          tone === "danger" && "bg-destructive/10 text-destructive",
          tone === "warning" && "bg-warning/15 text-warning-foreground dark:text-warning",
          tone === "info" && "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{note}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function Dashboard({ data, name }: { data: DashboardData; name: string }) {
  const { squad, week, money } = data;
  const batches = squad.byBatch.slice(0, SHOWN_BATCHES);
  const otherBatches = squad.byBatch.slice(SHOWN_BATCHES);
  const maxBatch = Math.max(1, ...batches.map((b) => b.count));
  const upcoming = week?.upcoming ?? [];

  const todos = [
    money?.overdueInvoices
      ? {
          href: "/invoices?status=OVERDUE",
          icon: Receipt,
          title: plural(money.overdueInvoices, "overdue invoice"),
          note: `${formatCurrency(money.overdueAmount)} past its due date`,
          tone: "danger" as const,
        }
      : null,
    week?.unmarked
      ? {
          href: "/sessions",
          icon: ClipboardCheck,
          title: `${plural(week.unmarked, "session")} without attendance`,
          note: "Held in the last 14 days, nobody marked who came",
          tone: "warning" as const,
        }
      : null,
    squad.pending
      ? {
          href: "/players?status=PENDING",
          icon: UserRoundCheck,
          title: `${plural(squad.pending, "athlete")} pending`,
          note: "Registered but not yet activated",
          tone: "info" as const,
        }
      : null,
  ].filter((t) => t !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${name.split(" ")[0]}`}
        description={format(new Date(), "EEEE d MMMM yyyy")}
        actions={
          <>
            {week && (
              <Button variant="outline" asChild>
                <Link href="/sessions">
                  <CalendarPlus /> Plan a session
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/players/create">
                <UserPlus /> Register athlete
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active athletes"
          value={squad.active.toLocaleString()}
          note={squad.joined ? `+${squad.joined} joined this month` : `${squad.total.toLocaleString()} on the roster`}
          href="/players"
        />
        {week && (
          <StatCard
            label="Sessions this week"
            value={week.sessions.length}
            note={week.todayCount ? `${week.todayCount} today` : "None today"}
            href="/sessions"
          />
        )}
        {money && (
          <>
            <StatCard
              label="Collected this month"
              value={formatCurrency(money.collectedThisMonth)}
              tone="success"
              note={
                money.change === null ? (
                  "Nothing collected by now last month"
                ) : (
                  <span className={cn("inline-flex items-center gap-0.5", money.change >= 0 ? "text-success" : "text-destructive")}>
                    {money.change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {Math.round(Math.abs(money.change) * 100)}% vs this point last month
                  </span>
                )
              }
              href="/transactions"
            />
            <StatCard
              label="Outstanding fees"
              value={formatCurrency(money.outstanding)}
              tone={money.overdueInvoices ? "danger" : "default"}
              note="Owed on open invoices, after discounts"
              href="/invoices"
            />
          </>
        )}
      </div>

      {todos.length > 0 && (
        <section aria-label="Needs attention" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {todos.map((t) => (
            <Todo key={t.href} {...t} />
          ))}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        {week && (
          <Panel title="Coming up" href="/sessions" linkLabel="All sessions" className="xl:col-span-3">
            {upcoming.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing else scheduled this week.{" "}
                <Link href="/sessions" className="font-medium text-primary">
                  Plan a session
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {upcoming.slice(0, SHOWN_SESSIONS).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/view/${s.id}`}
                      className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
                    >
                      <div
                        className={cn(
                          "rounded-md py-1 text-center leading-none",
                          isToday(s.date) ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        <p className="text-[10px] font-semibold uppercase opacity-80">
                          {isToday(s.date) ? "Today" : format(s.date, "EEE")}
                        </p>
                        <p className="font-display text-xl font-bold">{format(s.date, "HH:mm")}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.batch.name} · {s.location.name} · {s.coach.fullNames}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={s.status} />
                        <span className="tabular text-xs text-muted-foreground">{plural(s._count.athletes, "athlete")}</span>
                      </div>
                    </Link>
                  </li>
                ))}
                {upcoming.length > SHOWN_SESSIONS && (
                  <li className="px-4 py-2.5 text-center text-sm">
                    <Link href="/sessions" className="text-muted-foreground hover:text-foreground">
                      +{upcoming.length - SHOWN_SESSIONS} more this week
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </Panel>
        )}

        {money && (
          <Panel
            title="Latest payments"
            href="/transactions"
            linkLabel="All payments"
            className={week ? "xl:col-span-2" : "xl:col-span-5"}
          >
            {money.recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {money.recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {p.athlete.firstName} {p.athlete.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {METHOD_LABEL[p.paymentType]} · {format(p.paymentDate, "d MMM")}
                      </p>
                    </div>
                    <p className="tabular shrink-0 font-mono text-sm font-semibold">{formatCurrency(p.amountPaid)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {money && (
          <Panel title="Collections, last 12 months" href="/stats?range=12m" linkLabel="Reports" className="xl:col-span-3">
            {money.income.some((m) => m.total > 0) ? (
              <div className="p-4">
                <IncomeChart data={money.income} />
              </div>
            ) : (
              <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                Collections will chart here once payments are recorded.
              </p>
            )}
          </Panel>
        )}

        <Panel
          title="Squad by batch"
          href="/players"
          linkLabel="Roster"
          className={money ? "xl:col-span-2" : "xl:col-span-5"}
        >
          <ul className="space-y-2.5 p-4">
            {batches.map((b) => (
              <li key={b.name} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 font-medium break-words">{b.name}</span>
                  <span className="tabular shrink-0 text-muted-foreground">{b.count}</span>
                </div>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(b.count / maxBatch) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
          {otherBatches.length > 0 && (
            <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              +{plural(otherBatches.length, "smaller batch", "smaller batches")} ·{" "}
              {plural(otherBatches.reduce((s, b) => s + b.count, 0), "athlete")}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
