import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WeeklyPayments = ({ data }: { data: dashboardItems }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {data.weeklyPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments have been recorded this week.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.weeklyPayments.map((payment, i) => (
                <TableRow key={payment.receiptNumber}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    {payment.athlete.firstName} {payment.athlete.lastName} (
                    {payment.athlete.athleteId})
                  </TableCell>
                  <TableCell>{payment.amountPaid}</TableCell>
                  <TableCell>{payment.paymentType}</TableCell>
                  <TableCell>{payment.receiptNumber}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyPayments;
