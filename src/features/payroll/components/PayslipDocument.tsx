import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";
import type { getAcademyQueryType } from "@/features/academy/queries";
import { Letterhead, s } from "@/features/finance/components/StatementDocument";
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
const half = { width: "48%" } as const;

function Rows({ title, lines, total, totalLabel }: { title: string; lines: Line[]; total: number; totalLabel: string }) {
  return (
    <View style={half}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={[s.table, { marginTop: 0 }]}>
        {lines.map((l, i) => (
          <View key={i} style={s.row}>
            <Text style={{ width: "62%" }}>{l.name}</Text>
            <Text style={{ width: "38%", textAlign: "right" }}>{formatCurrency(l.amount)}</Text>
          </View>
        ))}
        {!lines.length && (
          <View style={s.row}>
            <Text style={s.muted}>None</Text>
          </View>
        )}
        <View style={s.head}>
          <Text style={{ width: "62%" }}>{totalLabel}</Text>
          <Text style={{ width: "38%", textAlign: "right" }}>{formatCurrency(total)}</Text>
        </View>
      </View>
    </View>
  );
}

/** A month's payslip in the statement's design; provisional ones carry a watermark. */
export function PayslipDocument({ academy, logoUrl, slip }: { academy: getAcademyQueryType | null; logoUrl: string; slip: PayslipData }) {
  const label = new Date(`${slip.month}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const p = slip.staff;
  const employer = slip.lines.filter((l) => l.kind === "EMPLOYER");
  return (
    <Document title={`Payslip ${p.staffId} ${slip.month}`}>
      <Page size="A4" style={s.page}>
        {slip.provisional && (
          <Text fixed style={{ position: "absolute", top: 380, left: 60, fontSize: 72, color: "#f1f5f9", transform: "rotate(-30deg)", fontWeight: "bold" }}>
            PROVISIONAL
          </Text>
        )}
        <Letterhead academy={academy} logoUrl={logoUrl} title="Payslip" period={label} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={s.sectionTitle}>Employee</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>{p.fullNames}</Text>
            <Text style={s.muted}>
              {p.staffId}
              {p.jobTitle ? ` · ${p.jobTitle}` : ""}
            </Text>
          </View>
          <View style={[s.muted, { textAlign: "right" }]}>
            {p.kraPin && <Text>KRA PIN {p.kraPin}</Text>}
            {p.nssfNumber && <Text>NSSF {p.nssfNumber}</Text>}
            {p.shifNumber && <Text>SHIF {p.shifNumber}</Text>}
          </View>
        </View>
        <View style={s.separator} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Rows title="Earnings" lines={slip.lines.filter((l) => l.kind === "BASIC" || l.kind === "ALLOWANCE")} total={slip.gross} totalLabel="Gross pay" />
          <Rows title="Deductions" lines={slip.lines.filter((l) => OFF.has(l.kind))} total={slip.deductions} totalLabel="Total deductions" />
        </View>
        <View style={s.totals}>
          <View style={[s.totalRow, s.closing, { width: 260 }]}>
            <Text>Net pay</Text>
            <Text>{formatCurrency(slip.net)}</Text>
          </View>
          {p.payMethod && (
            <Text style={[s.muted, { marginTop: 4 }]}>
              Paid by {p.payMethod === "BANK" ? "bank" : "M-Pesa"}
              {p.payAccount ? ` · ${p.payAccount}` : ""}
            </Text>
          )}
        </View>
        {(slip.advanceLeft > 0 || employer.length > 0) && (
          <View style={s.payBox} wrap={false}>
            {slip.advanceLeft > 0 && <Text>Advance still to pay back: {formatCurrency(slip.advanceLeft)}</Text>}
            {employer.length > 0 && <Text style={s.muted}>Paid by the academy on top: {employer.map((l) => `${l.name.replace(" (employer)", "")} ${formatCurrency(l.amount)}`).join(" · ")}</Text>}
          </View>
        )}
        {slip.provisional && <Text style={[s.muted, { marginTop: 18 }]}>Provisional, subject to change by the admin.</Text>}
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Payslip · ${label} · Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
