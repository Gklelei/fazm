/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatAcademy } from "@/lib/academy-time";
import { averageText, GRADES, scoreText } from "../lib/grades";
import type { AthleteProgress, MetricProgress } from "../queries/progress";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  logo: { width: 48, height: 48, borderRadius: 4, marginBottom: 6 },
  academy: { fontSize: 14, fontWeight: "bold" },
  muted: { color: "#64748b" },
  title: { fontSize: 22, fontWeight: "bold", textTransform: "uppercase", textAlign: "right" },
  who: { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  name: { fontSize: 14, fontWeight: "bold" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  head: { flexDirection: "row", backgroundColor: "#f8fafc", padding: 6, fontWeight: "bold", fontSize: 9, color: "#64748b" },
  row: { flexDirection: "row", padding: 6, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  skill: { width: "34%" },
  col: { width: "16.5%", textAlign: "right" },
  better: { color: "#16a34a" },
  worse: { color: "#dc2626" },
  note: { marginBottom: 6, lineHeight: 1.4 },
  legend: { marginTop: 8, fontSize: 8, color: "#64748b" },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

const day = (d: string | Date) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const show = (m: MetricProgress, v: number | null) => (v == null ? "—" : scoreText(m, v));
const change = (m: MetricProgress) =>
  m.change == null || m.change === 0 ? "—" : `${m.change > 0 ? "+" : "−"}${m.kind === "GRADE" ? Math.abs(m.change) : `${Math.abs(m.change)}${m.unit ? ` ${m.unit}` : ""}`}`;

/** A progress report for parents: each skill's latest, change, best and batch average, then coach notes. */
export default function AssessmentReport({
  athlete,
  progress,
  academy,
  logoUrl,
}: {
  athlete: { name: string; athleteId: string };
  progress: AthleteProgress;
  academy: { academyName?: string | null; logoUrl?: string | null } | null;
  logoUrl: string;
}) {
  const dates = progress.assessments.map((a) => a.date);
  const period = dates.length ? `${day(dates.at(-1)!)} – ${day(dates[0])}` : "";
  return (
    <Document title={`Progress report – ${athlete.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={academy?.logoUrl || logoUrl} style={s.logo} />
            <Text style={s.academy}>{academy?.academyName || "Fazam Football Academy"}</Text>
          </View>
          <View>
            <Text style={s.title}>Progress report</Text>
            <Text style={[s.muted, { textAlign: "right", marginTop: 4 }]}>{day(new Date())}</Text>
          </View>
        </View>

        <View style={s.who}>
          <Text style={s.name}>{athlete.name}</Text>
          <Text style={s.muted}>
            {athlete.athleteId}
            {progress.batch ? ` · ${progress.batch}` : ""} · {progress.assessments.length} assessment{progress.assessments.length === 1 ? "" : "s"}
            {period ? `, ${period}` : ""}
          </Text>
        </View>

        {progress.sections.map((sec) => (
          <View key={sec.id} style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{sec.name}</Text>
            <View style={s.table}>
              <View style={s.head}>
                <Text style={s.skill}>Skill</Text>
                <Text style={s.col}>Latest</Text>
                <Text style={s.col}>Change</Text>
                <Text style={s.col}>Best</Text>
                <Text style={s.col}>Batch average</Text>
              </View>
              {sec.metrics.map((m) => (
                <View key={m.id} style={s.row}>
                  <Text style={s.skill}>{m.label}</Text>
                  <Text style={[s.col, { fontWeight: "bold" }]}>{show(m, m.latest)}</Text>
                  <Text style={[s.col, m.change ? (m.change > 0 ? s.better : s.worse) : {}]}>{change(m)}</Text>
                  <Text style={s.col}>{show(m, m.best)}</Text>
                  <Text style={[s.col, s.muted]}>{(m.batchAverage == null ? "—" : averageText(m, m.batchAverage))}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {progress.assessments.some((a) => a.comment || a.notes.length) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Coach notes</Text>
            {progress.assessments
              .filter((a) => a.comment || a.notes.length)
              .slice(0, 5)
              .map((a) => (
                <View key={a.id} style={s.note} wrap={false}>
                  <Text style={s.muted}>
                    {day(a.date)} · {a.coach}
                  </Text>
                  {a.notes.map((n) => (
                    <Text key={n.section}>
                      {n.section}: {n.note}
                    </Text>
                  ))}
                  {a.comment && <Text>{a.comment}</Text>}
                </View>
              ))}
          </View>
        )}

        <Text style={s.legend}>
          Grades: {GRADES.map((g) => `${g.short} ${g.label}`).join(" · ")}. Batch average: the batch&apos;s latest scores over the last 6 months.
        </Text>
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${athlete.name} · page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
