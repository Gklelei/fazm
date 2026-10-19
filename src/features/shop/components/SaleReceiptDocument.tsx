import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import type { getAcademyQueryType } from "@/features/academy/queries";
import { Letterhead, s } from "@/features/finance/components/StatementDocument";
import type { SaleDetail } from "../queries";

const PAID = { MPESA: "M-Pesa", CASH: "Cash" } as Record<string, string>;

/** A shop sale's receipt, in the statement design. Charged sales say which invoice to pay. */
export function SaleReceiptDocument({ academy, logoUrl, sale }: { academy: getAcademyQueryType | null; logoUrl: string; sale: SaleDetail }) {
  const date = formatAcademy(sale.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return (
    <Document title={`Receipt ${sale.saleNumber}`}>
      <Page size="A4" style={s.page}>
        {sale.status === "CANCELLED" && <Text fixed style={{ position: "absolute", top: 380, left: 90, fontSize: 72, color: "#fee2e2", transform: "rotate(-30deg)", fontWeight: "bold" }}>CANCELLED</Text>}
        <Letterhead academy={academy} logoUrl={logoUrl} title={sale.status === "ON_ACCOUNT" ? "Sale" : "Receipt"} period={sale.saleNumber} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={s.sectionTitle}>Sold to</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>{sale.customer ?? "Walk-in customer"}</Text>
            {sale.athleteId && <Text style={s.muted}>{sale.athleteId}</Text>}
          </View>
          <View style={[s.muted, { textAlign: "right" }]}>
            <Text>{date}</Text>
            {sale.soldBy && <Text>Served by {sale.soldBy}</Text>}
          </View>
        </View>
        <View style={s.table}>
          <View style={s.head}>
            <Text style={{ width: "52%" }}>Item</Text>
            <Text style={{ width: "12%", textAlign: "right" }}>Qty</Text>
            <Text style={{ width: "18%", textAlign: "right" }}>Price</Text>
            <Text style={{ width: "18%", textAlign: "right" }}>Amount</Text>
          </View>
          {sale.lines.map((l, i) => (
            <View key={i} style={s.row}>
              <Text style={{ width: "52%" }}>{l.description}</Text>
              <Text style={{ width: "12%", textAlign: "right" }}>{l.quantity}</Text>
              <Text style={{ width: "18%", textAlign: "right" }}>{formatCurrency(l.unitPrice)}</Text>
              <Text style={{ width: "18%", textAlign: "right" }}>{formatCurrency(l.amount)}</Text>
            </View>
          ))}
        </View>
        <View style={s.totals}>
          <View style={[s.totalRow, s.closing]}>
            <Text>{sale.status === "ON_ACCOUNT" ? "Charged" : "Paid"}</Text>
            <Text>{formatCurrency(sale.total)}</Text>
          </View>
          <Text style={[s.muted, { marginTop: 4 }]}>
            {sale.status === "ON_ACCOUNT" && sale.invoice ? `Added to invoice ${sale.invoice.invoiceNumber}` : `By ${PAID[sale.paymentType ?? ""] ?? "—"}${sale.reference ? ` · ${sale.reference}` : ""}`}
          </Text>
        </View>
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${sale.saleNumber} · Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}
