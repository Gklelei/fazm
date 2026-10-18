/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import type { getAcademyQueryType } from "@/features/academy/queries";
import { howToPay } from "@/features/academy/lib/how-to-pay";
import type { Statement } from "../lib/statement";

/** The statement PDF, in the invoice PDF's style: letterhead, period, ledger, closing balance. */
const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 52, height: 52, borderRadius: 4, marginBottom: 8 },
  academyName: { fontSize: 14, fontWeight: "bold" },
  muted: { color: "#64748b", lineHeight: 1.5 },
  title: { fontSize: 28, fontWeight: "bold", textTransform: "uppercase", color: "#e2e8f0", textAlign: "right" },
  meta: { textAlign: "right", marginTop: 3, color: "#64748b" },
  sectionTitle: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", color: "#64748b", marginBottom: 6, letterSpacing: 1 },
  separator: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginVertical: 16 },
  table: { marginTop: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  head: { flexDirection: "row", backgroundColor: "#f8fafc", padding: 6, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  row: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  date: { width: "13%" },
  desc: { width: "35%" },
  ref: { width: "16%" },
  num: { width: "12%", textAlign: "right" },
  totals: { alignItems: "flex-end", marginTop: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", width: 220, paddingVertical: 2 },
  closing: { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#e2e8f0", fontWeight: "bold", fontSize: 11 },
  payBox: { marginTop: 22, backgroundColor: "#f8fafc", padding: 10, borderRadius: 6 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 7, color: "#94a3b8" },
});

const day = (d: string) => formatAcademy(new Date(`${d}T12:00:00+03:00`), { day: "numeric", month: "short", year: "numeric" });
const money = (n: number) => (n ? formatCurrency(n) : "");

export function StatementDocument({
  academy,
  athlete,
  statement,
  from,
  to,
  logoUrl,
}: {
  academy: getAcademyQueryType | null;
  athlete: { athleteId: string; name: string; batch: string | null; guardian: string | null };
  statement: Statement;
  from?: string;
  to?: string;
  logoUrl: string;
}) {
  const period = from || to ? `${from ? day(from) : "Start"} – ${to ? day(to) : "today"}` : "All time";
  return (
    <Document title={`Statement ${athlete.athleteId}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={academy?.logoUrl || logoUrl} style={s.logo} />
            <Text style={s.academyName}>{academy?.academyName || "Fazam Football Academy"}</Text>
            <View style={s.muted}>
              {academy?.address && <Text>{academy.address}</Text>}
              {academy?.contactEmail && <Text>{academy.contactEmail}</Text>}
              {academy?.contactPhone && <Text>{academy.contactPhone}</Text>}
              {academy?.kraPin && <Text>KRA PIN {academy.kraPin}</Text>}
            </View>
          </View>
          <View>
            <Text style={s.title}>Statement</Text>
            <Text style={s.meta}>{period}</Text>
            <Text style={s.meta}>Issued {formatAcademy(new Date(), { day: "numeric", month: "short", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={s.separator} />

        <Text style={s.sectionTitle}>Statement for</Text>
        <Text style={{ fontWeight: "bold", fontSize: 11 }}>{athlete.name}</Text>
        <Text style={s.muted}>
          {athlete.athleteId}
          {athlete.batch ? ` · ${athlete.batch}` : ""}
          {athlete.guardian ? ` · ${athlete.guardian}` : ""}
        </Text>

        <View style={s.table}>
          <View style={s.head} fixed>
            <Text style={s.date}>Date</Text>
            <Text style={s.desc}>Description</Text>
            <Text style={s.ref}>Reference</Text>
            <Text style={s.num}>Charge</Text>
            <Text style={s.num}>Paid / off</Text>
            <Text style={s.num}>Balance</Text>
          </View>
          {from && (
            <View style={s.row}>
              <Text style={s.date}>{day(from)}</Text>
              <Text style={[s.desc, { fontWeight: "bold" }]}>Balance brought forward</Text>
              <Text style={s.ref} />
              <Text style={s.num} />
              <Text style={s.num} />
              <Text style={s.num}>{formatCurrency(statement.opening)}</Text>
            </View>
          )}
          {statement.lines.map((l) => (
            <View key={l.key} style={s.row} wrap={false}>
              <Text style={s.date}>{day(l.day)}</Text>
              <Text style={s.desc}>{l.description}</Text>
              <Text style={s.ref}>{l.reference}</Text>
              <Text style={s.num}>{money(l.charge)}</Text>
              <Text style={s.num}>{money(l.credit)}</Text>
              <Text style={s.num}>{formatCurrency(l.balance)}</Text>
            </View>
          ))}
          {statement.lines.length === 0 && (
            <View style={s.row}>
              <Text style={{ color: "#64748b" }}>Nothing in this period.</Text>
            </View>
          )}
        </View>

        <View style={s.totals} wrap={false}>
          {from && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Brought forward</Text>
              <Text>{formatCurrency(statement.opening)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.muted}>Charges</Text>
            <Text>{formatCurrency(statement.charges)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Paid and discounts</Text>
            <Text>−{formatCurrency(statement.credits)}</Text>
          </View>
          <View style={[s.totalRow, s.closing]}>
            <Text>{statement.closing > 0 ? "Balance due" : statement.closing < 0 ? "In credit" : "Balance"}</Text>
            <Text>{formatCurrency(Math.abs(statement.closing))}</Text>
          </View>
        </View>

        {statement.closing > 0 && howToPay(academy, { athleteId: athlete.athleteId }).length > 0 && (
          <View style={s.payBox} wrap={false}>
            <Text style={s.sectionTitle}>Payment instructions</Text>
            {howToPay(academy, { athleteId: athlete.athleteId }).map((r) => (
              <Text key={r.label}>
                {r.label}: {r.value}
              </Text>
            ))}
          </View>
        )}

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${athlete.name} · ${athlete.athleteId} · Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
