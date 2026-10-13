import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Panel, ShareList } from "@/components/shared/Panel";
import { StatCard } from "@/components/shared/StatCard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportRange } from "../lib/range";
import type { Report } from "../queries/get-report";
import { RangePicker } from "./RangePicker";
import { TrendChart } from "./TrendChart";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** Severity colours for the unpaid-fees age buckets, oldest darkest. */
const AGE_TONES = ["bg-chart-5", "bg-chart-2", "bg-chart-4/70", "bg-chart-4", "bg-destructive"];

function Change({ value }: { value: number | null }) {
  if (value === null) return <span>No payments in the previous period</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-success" : "text-destructive")}>
      <Icon className="size-3.5" aria-hidden />
      {pct(Math.abs(value))} {up ? "up" : "down"} on the previous period
    </span>
  );
}

/** A big figure with a small label, for inline summaries inside panels. */
function Figure({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-display tabular text-3xl leading-tight font-bold">{value}</p>
    </div>
  );
}

export function ReportPage({ range, report }: { range: ReportRange; report: Report }) {
  const { money, unpaid, training, squad } = report;
  const recordedShare = training.sessions ? training.recorded / training.sessions : 0;
  const turnout = training.marked ? training.present / training.marked : null;
  const period = `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={
          <>
            <span className="font-medium text-foreground">{range.label}</span> · {period}
          </>
        }
        actions={
          <RangePicker
            preset={range.preset}
            from={format(range.from, "yyyy-MM-dd")}
            to={format(range.to, "yyyy-MM-dd")}
          />
        }
      />

      {/* ---- Money */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatCurrency(money.collected)}
          tone="success"
          note={
            <>
              {plural(money.payments, "payment")}
              <br />
              <Change value={money.change} />
            </>
          }
          href={`/transactions?from=${format(range.from, "yyyy-MM-dd")}&to=${format(range.to, "yyyy-MM-dd")}`}
        />
        <StatCard label="Billed" value={formatCurrency(money.billed)} note={`${plural(money.invoicesIssued, "invoice")} issued, after discounts`} />
        <StatCard
          label="Spent"
          value={formatCurrency(money.spent)}
          note={money.byCategory.length ? `${plural(money.byCategory.length, "category", "categories")}` : "No expenses recorded"}
          href="/expenses"
        />
        <StatCard
          label="Net"
          value={formatCurrency(money.net)}
          tone={money.net < 0 ? "danger" : "default"}
          note="Collected less spent"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Panel
            title="Money in and out"
            aside={<span className="text-xs text-muted-foreground">{range.bucket === "day" ? "By day" : "By month"}</span>}
          >
            <div className="p-4">
              {money.collected || money.spent ? (
                <TrendChart data={money.trend} showSpent={money.spent > 0} />
              ) : (
                <p className="py-20 text-center text-sm text-muted-foreground">No payments or expenses in this period.</p>
              )}
            </div>
          </Panel>
          <Panel title="Collected by batch">
            <ShareList rows={money.byBatch} format={formatCurrency} unit="payment" empty="No payments in this period." />
          </Panel>
        </div>
        <div className="space-y-6 xl:col-span-2">
          <Panel title="How families paid">
            <ShareList rows={money.byMethod} format={formatCurrency} unit="payment" empty="No payments in this period." />
          </Panel>
          <Panel title="Spending by category" href="/expenses" linkLabel="Expenses">
            <ShareList
              rows={money.byCategory}
              format={formatCurrency}
              unit="expense"
              empty={
                <>
                  No expenses recorded for this period.
                  <br />
                  Record them under Expenses to see true net income.
                </>
              }
            />
          </Panel>
        </div>
      </div>

      {/* ---- Unpaid fees (as of today) */}
      <Panel
        title="Unpaid fees today"
        href="/invoices?status=OVERDUE"
        linkLabel="Overdue invoices"
      >
        <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Figure label="Owed in total" value={formatCurrency(unpaid.total)} />
              <Figure label="Already late" value={<span className="text-destructive">{formatCurrency(unpaid.late)}</span>} />
            </div>
            <p className="text-sm text-muted-foreground">
              {plural(unpaid.athletes, "athlete")} with a balance. Not affected by the period above.
            </p>
            {unpaid.total > 0 && (
              <div
                className="flex h-3 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label="Share of unpaid fees by how late they are"
              >
                {unpaid.aging.map((a, i) =>
                  a.amount ? (
                    <span key={a.label} className={AGE_TONES[i]} style={{ width: `${(a.amount / unpaid.total) * 100}%` }} />
                  ) : null,
                )}
              </div>
            )}
            <ul className="space-y-2 text-sm">
              {unpaid.aging.map((a, i) => (
                <li key={a.label} className="flex items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-sm", AGE_TONES[i])} aria-hidden />
                  <span className="flex-1">{a.label}</span>
                  <span className="tabular w-20 text-right text-xs text-muted-foreground">{plural(a.count, "invoice")}</span>
                  <span className="tabular w-28 text-right font-mono font-semibold">{formatCurrency(a.amount)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Largest balances</p>
            {unpaid.top.length ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Athlete</th>
                      <th className="px-3 py-2 font-medium">Oldest due</th>
                      <th className="px-3 py-2 text-right font-medium">Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {unpaid.top.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2">
                          <Link href={`/players/user-profile/${d.id}`} className="font-medium hover:underline">
                            {d.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {d.batch} · {plural(d.invoices, "invoice")}
                          </p>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{format(d.oldest, "d MMM yyyy")}</td>
                        <td className="tabular px-3 py-2 text-right font-mono font-semibold whitespace-nowrap">
                          {formatCurrency(d.owed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nobody owes anything. 🎉</p>
            )}
          </div>
        </div>
      </Panel>

      {/* ---- Training */}
      <Panel title="Training and attendance" href="/sessions" linkLabel="Sessions">
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Figure label="Sessions held" value={training.sessions.toLocaleString()} />
            <Figure label="Attendance taken" value={training.sessions ? pct(recordedShare) : "—"} />
            <Figure label="Turnout" value={turnout === null ? "—" : pct(turnout)} />
          </div>
          {training.sessions > 0 && recordedShare < 0.8 && (
            <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" aria-hidden />
              <span>
                Attendance was taken at {training.recorded} of {plural(training.sessions, "session")}. Turnout only
                counts sessions where it was taken, so ask coaches to mark every session.
              </span>
            </p>
          )}
          {training.rows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 text-right font-medium">Sessions</th>
                    <th className="px-3 py-2 font-medium">Attendance taken</th>
                    <th className="px-3 py-2 text-right font-medium">Turnout</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {training.rows.map((t) => {
                    const taken = t.recorded / t.sessions;
                    return (
                      <tr key={t.name}>
                        <td className="px-3 py-2 font-medium">{t.name}</td>
                        <td className="tabular px-3 py-2 text-right">{t.sessions}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <span
                                className={cn("block h-full rounded-full", taken >= 0.8 ? "bg-success" : taken >= 0.4 ? "bg-chart-2" : "bg-destructive")}
                                style={{ width: `${Math.max(taken * 100, 2)}%` }}
                              />
                            </span>
                            <span className="tabular text-xs text-muted-foreground">
                              {t.recorded}/{t.sessions}
                            </span>
                          </div>
                        </td>
                        <td className="tabular px-3 py-2 text-right">{t.marked ? pct(t.present / t.marked) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No sessions held in this period.</p>
          )}
        </div>
      </Panel>

      {/* ---- Squad */}
      <Panel title="Squad" href="/players" linkLabel="Roster">
        <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="grid grid-cols-2 content-start gap-x-6 gap-y-4">
            <Figure label="Active today" value={squad.active.toLocaleString()} />
            <Link href="/players?status=PENDING" className="rounded-md hover:bg-muted/50">
              <Figure label="Pending today" value={squad.pending.toLocaleString()} />
            </Link>
            <Figure label="Inactive today" value={squad.inactive.toLocaleString()} />
            <Figure label="Joined this period" value={<span className="text-success">+{squad.joined}</span>} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Joined by batch</p>
            {squad.joinedByBatch.length ? (
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {squad.joinedByBatch.map((b) => (
                  <li key={b.name} className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm">
                    <span className="min-w-0 break-words">{b.name}</span>
                    <span className="tabular font-semibold">{b.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-sm text-muted-foreground">Nobody registered in this period.</p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
