import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/TansformWords";
import { CreditCard } from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  UNPAID: "bg-red-50 text-red-700 border-red-200",
  PENDING: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

const FinancialRecords = ({ data }: { data: GetAthleteByIdQueryType }) => {
  const total = data.finances.reduce((sum, f) => sum + Number(f.amountPaid), 0);

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-50">
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-base font-bold">
              Payment History
            </CardTitle>
          </div>
          {data.finances.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Total paid:{" "}
              <span className="font-semibold text-foreground">
                KES {total.toLocaleString()}
              </span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Receipt #</TableHead>
              <TableHead>Method</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.finances.length > 0 ? (
              data.finances.map((item, i) => (
                <TableRow key={item.receiptNumber}>
                  <TableCell className="pl-4 text-muted-foreground text-sm">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-700">
                    KES {Number(item.amountPaid).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(item.paymentDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.receiptNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {item.paymentType}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    <CreditCard className="h-7 w-7 opacity-20 mb-1" />
                    <p className="font-medium">No payments recorded</p>
                    <p className="text-xs">
                      This athlete has not made any transactions yet.
                    </p>
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

export default FinancialRecords;
