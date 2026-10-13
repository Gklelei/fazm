import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetAthleteByIdQueryType } from "@/features/athletes/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-success/10 text-success border-success/30  ",
  PARTIAL:
    "bg-warning/10 text-warning-foreground dark:text-warning border-warning/30  ",
  UNPAID:
    "bg-destructive/10 text-destructive border-destructive/30  ",
  OVERDUE:
    "bg-destructive/10 text-destructive border-destructive/30  ",
  PENDING: "bg-muted text-muted-foreground border-border",
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
                    <TableCell className="text-success font-medium">
                      KES {formatCurrency(paid)}
                    </TableCell>
                    <TableCell
                      className={
                        balance > 0
                          ? "text-destructive font-semibold"
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
