import { Card } from "@/components/ui/card";
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

const AthleteInvoices = ({ data }: { data: GetAthleteByIdQueryType }) => {
  return (
    <Card>
      {/* <pre>{JSON.stringify(data.invoices, null, 2)}</pre> */}
      <Table>
        <TableHeader>
          <TableHead>#</TableHead>
          <TableHead>Invoice #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Amount Due</TableHead>
          <TableHead>Amount paid</TableHead>
          <TableHead>status</TableHead>
        </TableHeader>
        <TableBody>
          {data && data.invoices.length > 0 ? (
            data.invoices.map((invoice, idx) => (
              <TableRow key={invoice.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.subscriptionPlan?.name}</TableCell>
                <TableCell>
                  {formatCurrency(Number(invoice.amountDue))}
                </TableCell>
                <TableCell>
                  {formatCurrency(Number(invoice.amountPaid))}
                </TableCell>
                <TableCell>
                  <Badge>{invoice.status}</Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-lg font-medium">No payments found</p>
                  <p className="text-sm">Athlete has no invoices yet.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export default AthleteInvoices;
