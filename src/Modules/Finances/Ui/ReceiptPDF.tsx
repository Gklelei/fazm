/* eslint-disable jsx-a11y/alt-text */
"use client";

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
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#000000",
  },
  container: {
    flex: 1,
  },
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
    width: 80,
    height: "auto",
  },
  headerText: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  companyTagline: {
    fontSize: 8,
    color: "#4B5563",
    marginTop: 2,
  },
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
  amountSection: {
    borderWidth: 1.5,
    borderColor: "#000000",
    padding: 15,
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  amountLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  notesSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F9FAFB",
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
  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    marginBottom: 40,
  },
  sigBlock: {
    width: "40%",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 5,
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  footerText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 7,
    lineHeight: 1.5,
  },
});

export const ReceiptPDF = ({ data }: { data: getFinanceDetails }) => {
  // Access global academy settings from context
  const { data: academyConfig } = UseUtilsContext();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              src={academyConfig?.academy?.logoUrl || "/Fazam Logo Half.jpg"}
              style={styles.logo}
            />
            <View style={styles.headerText}>
              <Text style={styles.companyName}>
                {academyConfig?.academy?.academyName || "ATHLETE ACADEMY"}
              </Text>
              <Text style={styles.companyTagline}>
                Official Payment Receipt
              </Text>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <View>
              <Text style={styles.title}>Receipt</Text>
              <Text style={{ fontSize: 9, color: "#6B7280" }}>
                Date:{" "}
                {data.paymentDate
                  ? format(new Date(data.paymentDate), "PPPP")
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.receiptRef}>
              <Text>REFERENCE NO</Text>
              <Text style={styles.receiptNumber}>{data.receiptNumber}</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.grid}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Athlete Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>
                  {`${data.athlete.firstName} ${data.athlete.lastName}`}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Athlete ID:</Text>
                <Text style={styles.value}>{data.athleteId}</Text>
              </View>
            </View>

            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Transaction Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Method:</Text>
                <Text style={styles.value}>{data.paymentType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.value}>PAID</Text>
              </View>
            </View>
          </View>

          {/* Amount Display */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Total Received</Text>
            <Text style={styles.amountValue}>
              KES{" "}
              {data.amountPaid?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>

          {/* Admin Info */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Processed By:</Text>
              <Text style={styles.value}>
                {data.collectedBy || "System Admin"}
              </Text>
            </View>
          </View>

          {/* Notes Section - Pulling from context */}
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes & Remarks</Text>
            <Text style={styles.notesText}>
              {academyConfig?.academy?.receiptFooterNotes ||
                "Thank you for your payment."}
              {"\n\n"}
              Please keep this receipt for your records. This is a
              computer-generated document and does not require a physical
              signature for validity.
            </Text>
          </View>

          {/* Signatures */}
          <View style={styles.signatureArea}>
            <View style={styles.sigBlock}>
              <Text style={styles.label}>Authorized Signature</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.label}>Official Stamp</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {academyConfig?.academy?.academyName} •{" "}
              {academyConfig?.academy?.contactEmail} •{" "}
              {academyConfig?.academy?.contactPhone}
            </Text>
            <Text style={[styles.footerText, { marginTop: 4 }]}>
              Generated on {format(new Date(), "PPpp")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
