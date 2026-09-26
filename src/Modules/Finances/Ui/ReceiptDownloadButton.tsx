"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReceiptPDF } from "./ReceiptPDF";
import type { getFinanceDetails } from "../Api/FetchTransactionDetails";
import type { ComponentProps } from "react";

type AcademyConfig = ComponentProps<typeof ReceiptPDF>["academyConfig"];

/**
 * Isolated in its own file so it can be loaded via next/dynamic with
 * ssr:false — @react-pdf/renderer is a large dependency that should only
 * be shipped to the client once a user actually opens a transaction's
 * details, not bundled into every page that renders TransactionDetails.
 */
export default function ReceiptDownloadButton({
  data,
  academyConfig,
}: {
  data: getFinanceDetails;
  academyConfig?: AcademyConfig;
}) {
  return (
    <PDFDownloadLink
      document={<ReceiptPDF data={data} academyConfig={academyConfig} />}
      fileName={`Receipt-${data.receiptNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download
        </Button>
      )}
    </PDFDownloadLink>
  );
}
