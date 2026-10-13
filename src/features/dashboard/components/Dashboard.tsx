import Link from "next/link";
import { format, isToday } from "date-fns";
import { ArrowRight, CalendarPlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardData } from "../queries/get-dashboard";
import { IncomeChart } from "./IncomeChart";
import { METHOD_LABEL } from "@/features/finance/lib/methods";

function Panel({
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {linkLabel} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Dashboard({
  data,
  name,
}: {
  data: DashboardData;
  name: string;
}) {
  const { squad, week, money } = data;
  const maxBatch = Math.max(1, ...squad.byBatch.map((b) => b.count));

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
          value={squad.active}
          note={`${squad.total} on the roster`}
          href="/players"
        />
        {week && (
          <StatCard
            label="Sessions this week"
            value={week.sessions.length}
            note={
              week.todayCount
                ? `${week.todayCount} today`
                : "None scheduled today"
            }
            href="/sessions"
          />
        )}
        {money && (
          <>
            <StatCard
              label="Collected this month"
              value={formatCurrency(money.collectedThisMonth)}
              tone="success"
              href="/transactions"
            />
            <StatCard
              label="Outstanding fees"
              value={formatCurrency(money.outstanding)}
              tone={money.overdueInvoices ? "danger" : "default"}
              note={
                money.overdueInvoices
                  ? `${money.overdueInvoices} overdue invoice${money.overdueInvoices === 1 ? "" : "s"}`
                  : "Nothing overdue"
              }
              href="/invoices"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {week && (
          <Panel
            title="This week"
            href="/sessions"
            linkLabel="All sessions"
            className="xl:col-span-3"
          >
            {week.sessions.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No sessions this week.{" "}
                <Link href="/sessions" className="font-medium text-primary">
                  Plan one
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {week.sessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/view/${s.id}`}
                      className={cn(
                        "grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-muted/50",
                        isToday(s.date) && "bg-accent/40",
                      )}
                    >
                      <div className="text-center leading-none">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">
                          {format(s.date, "EEE")}
                        </p>
                        <p className="font-display text-2xl font-bold">
                          {format(s.date, "d")}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {format(s.date, "HH:mm")} · {s.batch.name} ·{" "}
                          {s.location.name} · {s.coach.fullNames}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={s.status} />
                        <span className="tabular text-xs text-muted-foreground">
                          {s._count.athletes} athletes
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
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
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y">
                {money.recent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {p.athlete.firstName} {p.athlete.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {METHOD_LABEL[p.paymentType]} ·{" "}
                        {format(p.paymentDate, "d MMM")} ·{" "}
                        <span className="font-mono">{p.receiptNumber}</span>
                      </p>
                    </div>
                    <p className="tabular shrink-0 font-mono text-sm font-semibold">
                      {formatCurrency(p.amountPaid)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {money && (
          <Panel title="Collections, last 12 months" className="xl:col-span-3">
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
          <ul className="space-y-3 p-4">
            {squad.byBatch.map((b) => (
              <li key={b.name} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate font-medium">{b.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(b.count / maxBatch) * 100}%` }}
                  />
                </span>
                <span className="tabular text-right text-muted-foreground">
                  {b.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
