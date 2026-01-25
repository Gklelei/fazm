import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FinancialRecords = ({ data }: { data: Athlete["finances"] }) => {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Amount paid</TableHead>
            <TableHead>Payment date</TableHead>
            <TableHead>Expiary date</TableHead>
            <TableHead>Receipt number</TableHead>
            <TableHead>Payment method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item, i) => (
            <TableRow key={item.receiptNumber}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>Kshs.{item.amountPaid}</TableCell>
              <TableCell>{item.paymentDate.toDateString()}</TableCell>
              <TableCell>{item.subscriptionEndDate.toDateString()}</TableCell>
              <TableCell>{item.receiptNumber}</TableCell>
              <TableCell>{item.paymentType}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default FinancialRecords;
