import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { getAcademyQueryType } from "@/features/academy/queries";
import { Letterhead, s as doc } from "@/features/finance/components/StatementDocument";
import type { Line } from "../lib/calculate";

export type PayslipData = {
  month: string;
  provisional: boolean;
  staff: { fullNames: string; staffId: string; jobTitle: string | null; kraPin: string | null; nssfNumber: string | null; shifNumber: string | null; payMethod: string | null; payAccount: string | null };
  gross: number;
  deductions: number;
  net: number;
  lines: Line[];
  /** Advances still owed after this payslip */
  advanceLeft: number;
};

const OFF = new Set(["DEDUCTION", "TAX", "ONE_OFF", "ADVANCE"]);
// Statutory first, in the order they're worked out, then PAYE, then the rest
const ORDER: Record<string, number> = { DEDUCTION: 0, TAX: 1, ONE_OFF: 2, ADVANCE: 3 };

/** 3,000.00 or -3,000.00 (ASCII minus: the PDF font has no Unicode minus sign) */
const amount = (n: number, minus = false) => `${minus && n ? "-" : ""}${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const t = StyleSheet.create({
  details: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, marginBottom: 14 },
  detail: { width: "33.33%", paddingVertical: 6, paddingHorizontal: 8 },
  detailLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  head: { flexDirection: "row", backgroundColor: "#0f172a", color: "#ffffff", paddingVertical: 6, paddingHorizontal: 8, fontWeight: "bold", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  section: { backgroundColor: "#f1f5f9", paddingVertical: 4, paddingHorizontal: 8, fontSize: 7.5, fontWeight: "bold", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  subtotal: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#cbd5e1", fontWeight: "bold" },
  net: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 8, backgroundColor: "#0f172a", color: "#ffffff", fontWeight: "bold", fontSize: 12 },
  label: { flex: 1, paddingRight: 8 },
  value: { width: 110, textAlign: "right" },
  minus: { width: 110, textAlign: "right", color: "#b91c1c" },
  note: { fontSize: 7.5, color: "#64748b", marginTop: 1 },
});

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={t.detail}>
      <Text style={t.detailLabel}>{label}</Text>
      <Text>{value || "—"}</Text>
    </View>
  );
}

function Row({ line, minus }: { line: { name: string; amount: number; detail?: string }; minus?: boolean }) {
  return (
    <View style={t.row} wrap={false}>
      <View style={t.label}>
        <Text>{line.name}</Text>
        {line.detail && <Text style={t.note}>{line.detail}</Text>}
      </View>
      <Text style={minus ? t.minus : t.value}>{amount(line.amount, minus)}</Text>
    </View>
  );
}

/**
 * A month's payslip: employee details, then one table read top to bottom in
 * the order pay is worked out (earnings, gross, statutory deductions, PAYE,
 * other deductions, net). Deductions carry a minus sign. The academy's
 * own contributions don't come off pay, so they aren't on the payslip.
 */
export function PayslipDocument({ academy, logoUrl, slip }: { academy: getAcademyQueryType | null; logoUrl: string; slip: PayslipData }) {
  const label = new Date(`${slip.month}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const p = slip.staff;
  const earnings = slip.lines.filter((l) => l.kind === "BASIC" || l.kind === "ALLOWANCE");
  const deductions = slip.lines
    .filter((l) => OFF.has(l.kind))
    .map((l) => (l.kind === "ADVANCE" && slip.advanceLeft > 0 ? { ...l, detail: `${amount(slip.advanceLeft)} still to pay back` } : l))
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);

  return (
    <Document title={`Payslip ${p.staffId} ${slip.month}`}>
      <Page size="A4" style={doc.page}>
        {slip.provisional && (
          <Text fixed style={{ position: "absolute", top: 380, left: 60, fontSize: 72, color: "#f1f5f9", transform: "rotate(-30deg)", fontWeight: "bold" }}>
            PROVISIONAL
          </Text>
        )}
        <Letterhead academy={academy} logoUrl={logoUrl} title="Payslip" period={label} />

        <View style={t.details}>
          <Detail label="Employee" value={p.fullNames} />
          <Detail label="Staff ID" value={p.staffId} />
          <Detail label="Job title" value={p.jobTitle} />
          <Detail label="KRA PIN" value={p.kraPin} />
          <Detail label="NSSF number" value={p.nssfNumber} />
          <Detail label="SHIF number" value={p.shifNumber} />
          <Detail label="Pay period" value={label} />
          <Detail label="Paid by" value={p.payMethod === "BANK" ? "Bank" : p.payMethod === "MPESA" ? "M-Pesa" : null} />
          <Detail label={p.payMethod === "BANK" ? "Account" : "M-Pesa number"} value={p.payAccount} />
        </View>

        <View style={t.table}>
          <View style={t.head} fixed>
            <Text style={t.label}>Description</Text>
            <Text style={t.value}>Amount (KES)</Text>
          </View>

          <Text style={t.section}>Earnings</Text>
          {earnings.map((l, i) => (
            <Row key={`e${i}`} line={l} />
          ))}
          <View style={t.subtotal} wrap={false}>
            <Text style={t.label}>Gross pay</Text>
            <Text style={t.value}>{amount(slip.gross)}</Text>
          </View>

          <Text style={t.section}>Deductions</Text>
          {deductions.length ? (
            deductions.map((l, i) => <Row key={`d${i}`} line={l} minus />)
          ) : (
            <View style={t.row}>
              <Text style={[t.label, { color: "#64748b" }]}>None</Text>
            </View>
          )}
          <View style={t.subtotal} wrap={false}>
            <Text style={t.label}>Total deductions</Text>
            <Text style={t.minus}>{amount(slip.deductions, true)}</Text>
          </View>

          <View style={t.net} wrap={false}>
            <Text style={t.label}>Net pay</Text>
            <Text style={t.value}>{amount(slip.net)}</Text>
          </View>
        </View>

        {slip.provisional && <Text style={[doc.muted, { marginTop: 14 }]}>Provisional, subject to change by the admin.</Text>}
        <Text style={doc.footer} fixed render={({ pageNumber, totalPages }) => `Payslip · ${p.fullNames} · ${label} · Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
