import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Panel } from "@/components/shared/Panel";
import { StatCard } from "@/components/shared/StatCard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportRange } from "../lib/range";
import type { Report } from "../queries/get-report";
import { RangePicker } from "./RangePicker";
import { SourceChart, TrendChart } from "./TrendChart";
import { DrillList, DrillProvider } from "./Drill";
import { athletePath } from "@/features/athletes/lib/athlete-links";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** Severity colours for the unpaid-fees age buckets, oldest darkest. */
const AGE_TONES = ["bg-chart-5", "bg-chart-2", "bg-chart-4/70", "bg-chart-4", "bg-destructive"];

function Change({ value, against }: { value: number | null; against: string }) {
  if (value === null) return <span className="block">Nothing in {against}</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("flex items-center gap-0.5 font-medium", up ? "text-success" : "text-destructive")}>
      <Icon className="size-3.5" aria-hidden />
      {pct(Math.abs(value))} {up ? "up" : "down"} on {against}
    </span>
  );
}

/** Where a panel's numbers come from. */
const Source = ({ children }: { children: React.ReactNode }) => <p className="mt-auto border-t px-4 py-2 text-xs text-muted-foreground print:hidden">{children}</p>;

/** A big figure with a small label, for inline summaries inside panels. */
function Figure({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-display tabular text-3xl leading-tight font-bold">{value}</p>
    </div>
  );
}

/** Under all programmes: each programme's money and turnout side by side. */
function ByProgramme({ rows, shared }: { rows: Report["programmes"]["rows"]; shared: number }) {
  return (
    <Panel title="By programme">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Programme</th>
              <th className="px-3 py-2 text-right font-medium">Fees in</th>
              <th className="px-3 py-2 text-right font-medium">Spent</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
              <th className="px-3 py-2 text-right font-medium">Unpaid today</th>
              <th className="px-3 py-2 text-right font-medium">Active athletes</th>
              <th className="px-3 py-2 text-right font-medium">Joined</th>
              <th className="px-3 py-2 text-right font-medium">Transferred in</th>
              <th className="px-3 py-2 text-right font-medium">Transferred out</th>
              <th className="px-4 py-2 text-right font-medium">Turnout</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="tabular px-3 py-2 text-right">{formatCurrency(r.fees)}</td>
                <td className="tabular px-3 py-2 text-right">{formatCurrency(r.spent)}</td>
                <td className={cn("tabular px-3 py-2 text-right font-medium", r.fees - r.spent < 0 && "text-destructive")}>
                  {formatCurrency(r.fees - r.spent)}
                </td>
                <td className="tabular px-3 py-2 text-right">{formatCurrency(r.owed)}</td>
                <td className="tabular px-3 py-2 text-right">{r.athletes.toLocaleString()}</td>
                <td className="tabular px-3 py-2 text-right">{r.joined.toLocaleString()}</td>
                <td className="tabular px-3 py-2 text-right">{r.movedIn ? r.movedIn.toLocaleString() : "—"}</td>
                <td className="tabular px-3 py-2 text-right">{r.movedOut ? r.movedOut.toLocaleString() : "—"}</td>
                <td className="tabular px-4 py-2 text-right">{r.marked ? pct(r.present / r.marked) : "—"}</td>
              </tr>
            ))}
            {shared > 0 && (
              <tr className="text-muted-foreground">
                <td className="px-4 py-2">Shared costs</td>
                <td className="px-3 py-2 text-right">—</td>
                <td className="tabular px-3 py-2 text-right">{formatCurrency(shared)}</td>
                <td className="tabular px-3 py-2 text-right">{formatCurrency(-shared)}</td>
                <td className="px-3 py-2 text-right" colSpan={6} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Source>Fees from Payments on fee invoices, in the programme they were billed in. Spent: each programme&apos;s own Expenses; shared ones on their own line. Joined: registered in these dates, in the programme they joined. Transferred: moves between programmes in these dates. Shop sales aren&apos;t split.</Source>
    </Panel>
  );
}

export function ReportPage({ range, report }: { range: ReportRange; report: Report }) {
  const { money, unpaid, training, squad } = report;
  const recordedShare = training.sessions ? training.recorded / training.sessions : 0;
  const turnout = training.marked ? training.present / training.marked : null;
  const period = `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`;
  const from = format(range.from, "yyyy-MM-dd");
  const to = format(range.to, "yyyy-MM-dd");

  return (
    <DrillProvider from={from} to={to}>
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
            label="Money in"
            value={formatCurrency(money.collected)}
            tone="success"
            note={
              <>
                Fees {formatCurrency(money.fees)} · Shop {formatCurrency(money.shop)}
                <Change value={money.change} against="the previous period" />
                <Change value={money.changeYear} against="last year" />
              </>
            }
            href={`/transactions?from=${format(range.from, "yyyy-MM-dd")}&to=${format(range.to, "yyyy-MM-dd")}`}
          />
          <StatCard label="Billed" value={formatCurrency(money.billed)} note={`${plural(money.invoicesIssued, "invoice")} issued, after discounts`} />
          <StatCard
            label="Spent"
            value={formatCurrency(money.spent)}
            note={
              <>
                {money.byCategory.length ? `${plural(money.byCategory.length, "category", "categories")}` : "No expenses recorded"}
                {money.sharedSpent > 0 && (
                  <span className="block">Plus {formatCurrency(money.sharedSpent)} shared by all programmes</span>
                )}
              </>
            }
            href="/expenses"
          />
          <StatCard
            label="Net"
            value={formatCurrency(money.net)}
            tone={money.net < 0 ? "danger" : "default"}
            note="Money in less spent"
          />
        </div>

        {report.programmes.rows.length > 1 && <ByProgramme rows={report.programmes.rows} shared={report.programmes.shared} />}

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
              <Source>From Payments, paid shop sales and Expenses. Click a bar to see the records.</Source>
            </Panel>
            <Panel
              title="Income by source"
              aside={<span className="text-xs text-muted-foreground">Last year {formatCurrency(money.lastYear)}</span>}
            >
              <div className="p-4">
                {money.collected || money.lastYear ? (
                  <SourceChart data={money.trend} showLastYear={money.lastYear > 0} />
                ) : (
                  <p className="py-20 text-center text-sm text-muted-foreground">No income in this period.</p>
                )}
              </div>
              <DrillList
                rows={money.bySource.filter((x) => x.amount)}
                empty="No income in this period."
              />
              <Source>Fees: payments on fee invoices. Shop: sales paid at the counter, and payments on shop invoices. Click a bar or row to see the records.</Source>
            </Panel>
            <Panel title="Fees by batch">
              <DrillList
                rows={money.byBatch}
                unit="payment"
                empty="No payments in this period."
                title="Fees"
                series="fees"
                by="batch"
              />
              <Source>From Payments, by the athlete&apos;s batch today.</Source>
            </Panel>
          </div>
          <div className="space-y-6 xl:col-span-2">
            <Panel title="How families paid">
              <DrillList
                rows={money.byMethod}
                unit="payment"
                empty="No payments in this period."
                title="Fees"
                series="fees"
                by="method"
              />
              <Source>From Payments on fee invoices.</Source>
            </Panel>
            <Panel title="Spending by category" href="/expenses" linkLabel="Expenses">
              <DrillList
                rows={money.byCategory}
                unit="expense"
                title="Spent"
                series="spent"
                by="category"
                empty={
                  <>
                    No expenses recorded for this period.
                    <br />
                    Record them under Expenses to see true net income.
                  </>
                }
              />
              <Source>From Expenses, with approved payroll under Salaries.</Source>
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
                            <Link href={athletePath(d.id)} className="font-medium hover:underline">
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
        <Panel title="Athletes" href="/players" linkLabel="Roster">
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
    </DrillProvider>
  );
}
