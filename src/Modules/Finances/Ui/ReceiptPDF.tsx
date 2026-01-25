import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { getFinanceDetails } from "../Api/FetchTransactionDetails";

const styles = StyleSheet.create({
  page: {
    padding: 50, // Increased padding for a more premium feel
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#000000",
  },
  container: {
    flex: 1,
  },
  // Minimalist Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: "auto",
  },
  headerText: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  companyTagline: {
    fontSize: 9,
    color: "#4B5563",
    marginTop: 2,
  },

  // Document Info
  titleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  receiptRef: {
    fontSize: 10,
    color: "#4B5563",
    textAlign: "right",
  },
  receiptNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
  },

  // Content Grid
  grid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 30,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 4,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    color: "#6B7280",
    fontSize: 8,
    textTransform: "uppercase",
  },
  value: {
    fontWeight: "bold",
  },

  // High-Contrast Amount Box (Ink Friendly)
  amountSection: {
    borderWidth: 2,
    borderColor: "#000000",
    padding: 15,
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  amountLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "bold",
  },

  // Notes Section
  notesSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F9FAFB", // Very light gray for subtle contrast
    borderRadius: 2,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.4,
  },

  // Footer & Signature
  footer: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 20,
  },
  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 40,
  },
  sigBlock: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 5,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 8,
    lineHeight: 1.5,
  },
});

export const ReceiptPDF = ({ data }: { data: getFinanceDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.container}>
        {/* Minimal Header */}
        <View style={styles.header}>
          {/* 
            eslint-disable-next-line jsx-a11y/alt-text
             */}
          <Image src="/Fazam Logo Half.jpg" style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.companyName}>ATHLETE FINANCE</Text>
            <Text style={styles.companyTagline}>
              Payment Confirmation Statement
            </Text>
          </View>
        </View>

        {/* Title & Receipt ID */}
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Receipt</Text>
            <Text style={{ fontSize: 9, color: "#6B7280" }}>
              Issued on {format(new Date(data.paymentDate), "PPPP")}
            </Text>
          </View>
          <View style={styles.receiptRef}>
            <Text>RECEIPT NO</Text>
            <Text style={styles.receiptNumber}>{data.receiptNumber}</Text>
          </View>
        </View>

        {/* Information Grid */}
        <View style={styles.grid}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Payer Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Athlete Name:</Text>
              <Text
                style={styles.value}
              >{`${data.athlete.firstName} ${data.athlete.lastName}`}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Athlete ID:</Text>
              <Text style={styles.value}>{data.athleteId}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Method:</Text>
              <Text style={styles.value}>{data.paymentType}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>PAID / COMPLETE</Text>
            </View>
          </View>
        </View>

        {/* Highlighted Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount Received</Text>
          <Text style={styles.amountValue}>
            KES {data.amountPaid.toFixed(2)}
          </Text>
        </View>

        {/* Secondary Details */}
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Administrative</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Collected By:</Text>
            <Text style={styles.value}>{data.collectedBy}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Transaction Ref:</Text>
            <Text style={styles.value}>{data.receiptNumber}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Important Information</Text>
          <Text style={styles.notesText}>
            This document confirms that the payment above has been received and
            processed. Please retain this for your membership records. If this
            was a subscription payment, your account has been updated
            accordingly.
          </Text>
        </View>

        {/* Signature Area */}
        <View style={styles.signatureArea}>
          <View style={styles.sigBlock}>
            <Text style={styles.label}>Finance Officer Signature</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.label}>Official Stamp</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Athlete Finance System • support@athletefinance.com • +254 700 000
            000
          </Text>
          <Text
            style={[styles.footerText, { marginTop: 4, fontWeight: "bold" }]}
          >
            Generated automatically on {format(new Date(), "PPpp")}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);
