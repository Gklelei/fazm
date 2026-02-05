import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign } from "lucide-react";

const WeeklyPayments = ({ data }: { data: dashboardItems }) => {
  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Payments This Week
          </CardTitle>
          <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.weeklyPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No payments have been recorded this week.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeklyPayments.map((payment, i) => (
                  <TableRow key={payment.receiptNumber}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payment.athlete.firstName} {payment.athlete.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.athlete.athleteId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {payment.amountPaid}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted">
                        {payment.paymentType}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.receiptNumber}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyPayments;
