import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAcademy } from "@/lib/academy-time";
import { cn } from "@/lib/utils";
import { averageText, scoreText } from "@/features/assessments/lib/grades";
import type { AthleteProgress, MetricProgress } from "@/features/assessments/queries/progress";
import { athletePdfPath } from "@/features/athletes/lib/athlete-links";

/** A small line of the skill's scores, oldest to newest; up is always better. */
function Trend({ m }: { m: MetricProgress }) {
  const s = m.points.map((p) => p.score);
  if (s.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const [lo, hi] = m.kind === "GRADE" ? [1, 5] : [Math.min(...s), Math.max(...s)];
  const up = m.kind === "GRADE" || m.higherIsBetter;
  const W = 80;
  const H = 22;
  const pts = s
    .map((v, i) => {
      const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
      return `${((i / (s.length - 1)) * W).toFixed(1)},${(H - 2 - (up ? t : 1 - t) * (H - 4)).toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="text-primary" aria-label={`${s.length} assessments`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Change({ m }: { m: MetricProgress }) {
  if (m.change == null || m.change === 0) return <span className="text-muted-foreground">—</span>;
  const better = m.change > 0;
  const Icon = better ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 tabular-nums", better ? "text-success" : "text-destructive")}>
      <Icon className="size-3.5" />
      {m.kind === "GRADE" ? Math.abs(m.change) : `${Math.abs(m.change)}${m.unit ? ` ${m.unit}` : ""}`}
    </span>
  );
}

const show = (m: MetricProgress, v: number | null) => (v == null ? "—" : scoreText(m, v));

/** An athlete's assessments: each skill's progress against their batch, then the coaches' notes. */
export default function AthleteAssessments({ athleteId, progress }: { athleteId: string; progress: AthleteProgress }) {
  if (!progress.assessments.length) {
    return <p className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No assessments yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {progress.assessments.length} assessment{progress.assessments.length === 1 ? "" : "s"}
          {progress.batch && ` · compared with ${progress.batch} over the last 6 months`}
        </p>
        <Button variant="outline" asChild>
          <a href={athletePdfPath(athleteId, "assessment-report")} target="_blank" rel="noopener noreferrer">
            <FileDown /> Report
          </a>
        </Button>
      </div>

      {progress.sections.map((s) => (
        <section key={s.id} className="overflow-hidden rounded-lg border bg-card">
          <h3 className="border-b px-4 py-3 font-display text-base font-semibold tracking-wide uppercase">{s.name}</h3>
          {/* Phone: one block per skill */}
          <ul className="divide-y md:hidden">
            {s.metrics.map((m) => (
              <li key={m.id} className="space-y-1 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{m.label}</span>
                  <span className="font-semibold">{show(m, m.latest)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-3">
                    <Change m={m} />
                    {m.batchAverage != null && <span>Batch {(m.batchAverage == null ? "—" : averageText(m, m.batchAverage))}</span>}
                  </span>
                  <Trend m={m} />
                </div>
              </li>
            ))}
          </ul>
          {/* Desktop: a table */}
          <table className="hidden w-full table-fixed text-sm md:table">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="w-[30%] px-4 py-2">Skill</th>
                <th className="px-4 py-2">Latest</th>
                <th className="px-4 py-2">Change</th>
                <th className="px-4 py-2">Best</th>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {s.metrics.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 font-medium">{m.label}</td>
                  <td className="px-4 py-2.5 font-semibold">{show(m, m.latest)}</td>
                  <td className="px-4 py-2.5">
                    <Change m={m} />
                  </td>
                  <td className="px-4 py-2.5">{show(m, m.best)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{(m.batchAverage == null ? "—" : averageText(m, m.batchAverage))}</td>
                  <td className="px-4 py-2.5">
                    <Trend m={m} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="overflow-hidden rounded-lg border bg-card">
        <h3 className="border-b px-4 py-3 font-display text-base font-semibold tracking-wide uppercase">Coach notes</h3>
        <ol className="divide-y">
          {progress.assessments.map((a) => (
            <li key={a.id} className="space-y-1.5 px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                {formatAcademy(a.date, { day: "numeric", month: "short", year: "numeric" })} · {a.session} · {a.coach}
              </p>
              {a.notes.map((n) => (
                <p key={n.section}>
                  <span className="font-medium">{n.section}:</span> {n.note}
                </p>
              ))}
              {a.comment && <p>{a.comment}</p>}
              {!a.comment && !a.notes.length && <p className="text-muted-foreground">No notes.</p>}
            </li>
          ))}
        </ol>
      </section>
      <p className="text-xs text-muted-foreground">
        Grades: 1 Below standard · 2 Needs work · 3 Good · 4 Very good · 5 Excellent.{" "}
        <Link href="/assesments" className="underline">
          See the checklist
        </Link>
      </p>
    </div>
  );
}
