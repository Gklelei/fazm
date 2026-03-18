import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetAthleteByIdQueryType } from "../Types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/TansformWords";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300",
  PARTIAL:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
  UNPAID:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300",
  OVERDUE:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300",
  PENDING: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function statusStyle(status: string) {
  return STATUS_STYLES[status?.toUpperCase()] ?? STATUS_STYLES.PENDING;
}

const AthleteInvoices = ({ data }: { data: GetAthleteByIdQueryType }) => {
  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-bold">Invoices</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.invoices.length > 0 ? (
              data.invoices.map((invoice, idx) => {
                const due = Number(invoice.amountDue ?? 0);
                const paid = Number(invoice.amountPaid ?? 0);
                const disc = Number(
                  (invoice as Record<string, unknown>).discount ?? 0,
                );
                const balance = Math.max(due - disc - paid, 0);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="pl-4 text-muted-foreground text-sm">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.subscriptionPlan?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      KES {formatCurrency(due)}
                    </TableCell>
                    <TableCell className="text-emerald-700 font-medium">
                      KES {formatCurrency(paid)}
                    </TableCell>
                    <TableCell
                      className={
                        balance > 0
                          ? "text-red-600 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      KES {formatCurrency(balance)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold border ${statusStyle(invoice.status)}`}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="h-7 w-7 opacity-20 mb-1" />
                    <p className="font-medium">No invoices found</p>
                    <p className="text-xs">Athlete has no invoices yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AthleteInvoices;
