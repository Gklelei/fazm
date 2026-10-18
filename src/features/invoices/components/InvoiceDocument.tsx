/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Prisma } from "@/generated/prisma/client";
import { formatAcademy } from "@/lib/academy-time";
import { getAcademyQueryType } from "@/features/academy/queries";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginBottom: 10,
  },
  academyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  address: { color: "#64748b", lineHeight: 1.5 },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: "black",
    textTransform: "uppercase",
    color: "#e2e8f0",
    textAlign: "right",
  },
  metaText: { textAlign: "right", marginTop: 4, color: "#64748b" },
  statusBadge: {
    marginTop: 8,
    padding: "4 8",
    borderRadius: 4,
    backgroundColor: "#0f172a",
    color: "#ffffff",
    alignSelf: "flex-end",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginVertical: 20,
  },
  grid: { flexDirection: "row", gap: 40 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
    letterSpacing: 1,
  },
  table: {
    marginTop: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    padding: 8,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  col1: { width: "8%" },
  col2: { width: "50%" },
  col3: { width: "10%", textAlign: "center" },
  col4: { width: "16%", textAlign: "right" },
  col5: { width: "16%", textAlign: "right" },

  totalsContainer: { alignItems: "flex-end", marginTop: 20 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 190,
    paddingVertical: 2,
  },
  balanceRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontWeight: "bold",
    fontSize: 12,
  },
  paymentBox: {
    marginTop: 30,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});

function asNumber(v: unknown) {
  // Prisma Decimal sometimes stringifies; this covers Decimal | string | number | null
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const day = (d: Date) => formatAcademy(d, { day: "2-digit", month: "short", year: "numeric" });

export type InvoicePdfData = Prisma.InvoiceGetPayload<{
  include: {
    athlete: { select: { firstName: true; middleName: true; lastName: true; email: true; phoneNumber: true } };
    lines: true;
  };
}>;

function moneyKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

export default function InvoiceDocument({
  invoice,
  logoUrl,
  academy,
}: {
  invoice: InvoicePdfData;
  logoUrl: string;
  academy: getAcademyQueryType | null;
}) {
  const fullName = [
    invoice.athlete.firstName,
    invoice.athlete.middleName,
    invoice.athlete.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const amountDue = asNumber(invoice.amountDue);
  const amountPaid = asNumber(invoice.amountPaid);
  const discount = asNumber(invoice.discount);

  const lineTotal = Math.max(amountDue - discount, 0);
  const balance = Math.max(lineTotal - amountPaid, 0); // no negative balances in display

  const statusColor =
    invoice.status === "PAID"
      ? "#16a34a"
      : invoice.status === "PARTIAL"
        ? "#f59e0b"
        : invoice.status === "CANCELED"
          ? "#64748b"
          : "#ef4444";

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image src={academy?.logoUrl || logoUrl} style={styles.logo} />
            <Text style={styles.academyName}>
              {academy?.academyName || "Fazam Football Academy"}
            </Text>
            <View style={styles.address}>
              <Text>{academy?.address || "Kimathi Street, Nairobi"}</Text>
              <Text>
                {academy?.contactEmail || "academy@fazamfootball.org"}
              </Text>
              <Text>{academy?.contactPhone || "0714401466"}</Text>
              {academy?.kraPin && <Text>KRA PIN {academy.kraPin}</Text>}
            </View>
          </View>

          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.metaText}>No: {invoice.invoiceNumber}</Text>

            <Text style={styles.metaText}>Issued: {day(invoice.createdAt)}</Text>
            <Text style={styles.metaText}>Due: {day(invoice.dueDate)}</Text>

            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text>{invoice.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Billing Info */}
        <View style={styles.grid}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Billed To</Text>
            <Text style={{ fontWeight: "bold", fontSize: 11 }}>{fullName}</Text>
            <Text>ID: {invoice.athleteId}</Text>
            {invoice.athlete.email ? (
              <Text>{invoice.athlete.email}</Text>
            ) : null}
            {invoice.athlete.phoneNumber ? (
              <Text>{invoice.athlete.phoneNumber}</Text>
            ) : null}
          </View>

          {invoice.notes ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={{ lineHeight: 1.4 }}>{invoice.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>Description</Text>
            <Text style={styles.col3}>Qty</Text>
            <Text style={styles.col4}>Unit (KES)</Text>
            <Text style={styles.col5}>Amount (KES)</Text>
          </View>

          {invoice.lines.map((l, i) => (
            <View key={l.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.col1}>{i + 1}</Text>
              <Text style={styles.col2}>{l.description}</Text>
              <Text style={styles.col3}>{l.quantity}</Text>
              <Text style={styles.col4}>{asNumber(l.unitAmount).toLocaleString()}</Text>
              <Text style={[styles.col5, { fontWeight: "bold" }]}>{asNumber(l.amount).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.totalsContainer}>
          {discount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text>Subtotal</Text>
                <Text>{moneyKES(amountDue)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>Discount</Text>
                <Text>- {moneyKES(discount)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalRow}>
            <Text>Total</Text>
            <Text>{moneyKES(lineTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: "#16a34a" }}>Paid</Text>
            <Text style={{ color: "#16a34a" }}>{moneyKES(amountPaid)}</Text>
          </View>
          <View style={[styles.totalRow, styles.balanceRow]}>
            <Text>Balance</Text>
            <Text>{moneyKES(balance)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.paymentBox}>
          <Text style={styles.sectionTitle}>Payment Instructions</Text>
          <Text>
            {academy?.paymentMethodType || "M-Pesa Send Money"}:{" "}
            {academy?.paymentMathod || "0758080448"}
          </Text>
        </View>

        {academy?.documentTerms && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text style={{ color: "#555" }}>{academy.documentTerms}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          This invoice is system-generated. Contact the administrator for
          discrepancies.
        </Text>
      </Page>
    </Document>
  );
}
