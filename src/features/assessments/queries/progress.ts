import "server-only";
import { db } from "@/lib/prisma";
import { gradeScore } from "../lib/grades";

/** How far back the batch comparison looks. */
const BATCH_WINDOW_DAYS = 180;

export type MetricProgress = {
  id: string;
  label: string;
  kind: "GRADE" | "MEASURE";
  unit: string | null;
  higherIsBetter: boolean;
  /** Oldest first */
  points: { date: string; score: number }[];
  latest: number | null;
  /** Latest minus the one before; positive is always "better" */
  change: number | null;
  best: number | null;
  batchAverage: number | null;
  /** Athletes in the batch average */
  batchCount: number;
};

export type AssessmentEntry = {
  id: string;
  date: string;
  session: string;
  coach: string;
  comment: string | null;
  notes: { section: string; note: string }[];
};

export type AthleteProgress = {
  batch: string | null;
  sections: { id: string; name: string; metrics: MetricProgress[] }[];
  /** Newest first */
  assessments: AssessmentEntry[];
};

const scoreOf = (r: { grade: string | null; value: unknown }) => (r.grade ? gradeScore(r.grade) : r.value != null ? Number(r.value) : null);
const round = (n: number) => Math.round(n * 100) / 100;

/** One athlete's assessments: each skill over time, against their batch, plus the notes. */
export async function athleteProgress(athleteId: string, now = new Date()): Promise<AthleteProgress> {
  const athlete = await db.athlete.findUnique({ where: { athleteId }, select: { batchesId: true, batches: { select: { name: true } } } });
  const since = new Date(now.getTime() - BATCH_WINDOW_DAYS * 86_400_000);

  const [sections, mine, batch] = await Promise.all([
    db.assessmentTemplateSection.findMany({
      where: { isArchived: false },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        metrics: { where: { isArchived: false }, orderBy: [{ position: "asc" }, { label: "asc" }], select: { id: true, label: true, kind: true, unit: true, higherIsBetter: true } },
      },
    }),
    db.assessment.findMany({
      where: { athleteId },
      orderBy: { training: { date: "asc" } },
      select: {
        id: true,
        comment: true,
        training: { select: { date: true, name: true } },
        coach: { select: { fullNames: true } },
        responses: { select: { metricId: true, grade: true, value: true } },
        notes: { select: { note: true, section: { select: { name: true } } } },
      },
    }),
    athlete?.batchesId
      ? db.assessment.findMany({
          where: { athlete: { batchesId: athlete.batchesId, isArchived: false }, training: { date: { gte: since } } },
          orderBy: { training: { date: "asc" } },
          select: { athleteId: true, responses: { select: { metricId: true, grade: true, value: true } } },
        })
      : [],
  ]);

  // Each batch athlete's latest score per skill (later assessments overwrite earlier)
  const latestInBatch = new Map<string, Map<string, number>>();
  for (const a of batch) {
    for (const r of a.responses) {
      const s = scoreOf(r);
      if (s == null) continue;
      if (!latestInBatch.has(r.metricId)) latestInBatch.set(r.metricId, new Map());
      latestInBatch.get(r.metricId)!.set(a.athleteId, s);
    }
  }

  return {
    batch: athlete?.batches?.name ?? null,
    sections: sections
      .map((s) => ({
        ...s,
        metrics: s.metrics.map((m): MetricProgress => {
          const points = mine.flatMap((a) => {
            const r = a.responses.find((x) => x.metricId === m.id);
            const score = r && scoreOf(r);
            return score == null ? [] : [{ date: a.training.date.toISOString(), score }];
          });
          const scores = points.map((p) => p.score);
          const better = m.kind === "GRADE" || m.higherIsBetter ? 1 : -1;
          const latest = scores.at(-1) ?? null;
          const prev = scores.at(-2);
          const batchScores = [...(latestInBatch.get(m.id)?.values() ?? [])];
          return {
            ...m,
            points,
            latest,
            change: latest != null && prev != null ? round((latest - prev) * better) : null,
            best: scores.length ? (better > 0 ? Math.max(...scores) : Math.min(...scores)) : null,
            batchAverage: batchScores.length ? round(batchScores.reduce((a, b) => a + b, 0) / batchScores.length) : null,
            batchCount: batchScores.length,
          };
        }),
      }))
      .filter((s) => s.metrics.length),
    assessments: mine
      .map((a) => ({
        id: a.id,
        date: a.training.date.toISOString(),
        session: a.training.name,
        coach: a.coach.fullNames,
        comment: a.comment,
        notes: a.notes.map((n) => ({ section: n.section.name, note: n.note })),
      }))
      .reverse(),
  };
}
