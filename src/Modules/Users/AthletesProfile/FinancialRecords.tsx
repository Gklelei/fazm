import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GetAthleteByIdQueryType } from "../Types";

const FinancialRecords = ({ data }: { data: GetAthleteByIdQueryType }) => {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Amount paid</TableHead>
            <TableHead>Payment date</TableHead>
            <TableHead>Receipt number</TableHead>
            <TableHead>Payment method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.finances.length > 0 ? (
            data.finances.map((item, i) => (
              <TableRow key={item.receiptNumber}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>Kshs. {item.amountPaid.toLocaleString()}</TableCell>
                <TableCell>{item.paymentDate.toDateString()}</TableCell>
                <TableCell>{item.receiptNumber}</TableCell>
                <TableCell>{item.paymentType}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-lg font-medium">No payments found</p>
                  <p className="text-sm">
                    Athlete hasn&apos;t made any transactions yet.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export default FinancialRecords;
