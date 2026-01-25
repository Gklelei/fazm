import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { InvoiceType } from "@/Modules/Finances/Invoices/Types";
import { formatDate } from "@/utils/TansformWords";

// Mimicking Tailwind's color palette and spacing
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a", // slate-900
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
  address: {
    color: "#64748b", // slate-500
    lineHeight: 1.5,
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: "black",
    textTransform: "uppercase",
    color: "#e2e8f0", // slate-200 (opacity look)
    textAlign: "right",
  },
  metaText: {
    textAlign: "right",
    marginTop: 4,
    color: "#64748b",
  },
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
  grid: {
    flexDirection: "row",
    gap: 40,
  },
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
  col1: { width: "10%" },
  col2: { width: "50%" },
  col3: { width: "10%", textAlign: "center" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },

  totalsContainer: {
    alignItems: "flex-end",
    marginTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 150,
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

export default function InvoiceDocument({
  invoice,
  logoUrl,
}: {
  invoice: InvoiceType;
  logoUrl: string;
}) {
  const fullName = [
    invoice.athlete.firstName,
    invoice.athlete.middleName,
    invoice.athlete.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const balance = invoice.amountDue - invoice.amountPaid;

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            {/* 
            eslint-disable-next-line jsx-a11y/alt-text
             */}
            <Image src={logoUrl} style={styles.logo} />
            <Text style={styles.academyName}>Fazam Football Academy</Text>
            <View style={styles.address}>
              <Text>Kimathi Street, Nairobi</Text>
              <Text>academy@fazamfootball.org</Text>
              <Text>0714401466</Text>
            </View>
          </View>

          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.metaText}>No: {invoice.invoiceNumber}</Text>
            <Text style={styles.metaText}>
              Issued: {formatDate(new Date())}
            </Text>
            <Text style={styles.metaText}>
              Due: {formatDate(invoice.dueDate)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                invoice.status !== "PAID" ? { backgroundColor: "#ef4444" } : {},
              ]}
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
            {invoice.athlete.email && <Text>{invoice.athlete.email}</Text>}
            {invoice.athlete.phoneNumber && (
              <Text>{invoice.athlete.phoneNumber}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ lineHeight: 1.4 }}>
              {invoice.description || "No additional notes provided."}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>Description</Text>
            <Text style={styles.col3}>Qty</Text>
            <Text style={styles.col4}>Unit Price</Text>
            <Text style={styles.col5}>Total</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.col1}>1</Text>
            <Text style={styles.col2}>
              {invoice.description || "General Services"}
            </Text>
            <Text style={styles.col3}>1</Text>
            <Text style={styles.col4}>
              {invoice.amountDue.toLocaleString()}
            </Text>
            <Text style={[styles.col5, { fontWeight: "bold" }]}>
              {invoice.amountDue.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text>Total</Text>
            <Text>KES {invoice.amountDue.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: "#16a34a" }}>Paid</Text>
            <Text style={{ color: "#16a34a" }}>
              KES {invoice.amountPaid.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.balanceRow]}>
            <Text>Balance</Text>
            <Text>KES {balance.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentBox}>
          <Text style={styles.sectionTitle}>Payment Instructions</Text>
          <Text>M-Pesa Send Money: 0758080448</Text>
        </View>

        <Text style={styles.footer}>
          This invoice is system-generated. Contact the administrator for
          discrepancies.
        </Text>
      </Page>
    </Document>
  );
}
