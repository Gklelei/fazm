"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetAthleteByIdQueryType } from "../Types";
import ExportDropdown from "@/utils/ExportDropdown";
import { Badge } from "@/components/ui/badge";

interface AthleteStatementProps {
  data: GetAthleteByIdQueryType;
}

type StatementEntry = {
  id: string;
  date: Date;
  description: string;
  reference: string;
  type: "CHARGE" | "PAYMENT";
  amount: number;
};

export default function AthleteStatement({ data }: AthleteStatementProps) {
  const statementData = useMemo(() => {
    const entries: StatementEntry[] = [];

    // Add Invoices (Charges/Out)
    data.invoices?.forEach((inv) => {
      // Exclude canceled invoices from balance, or include them as zero - let's exclude
      if (inv.status !== "CANCELED") {
        entries.push({
          id: `inv-${inv.id}`,
          date: new Date(inv.createdAt),
          description: inv.description || "Invoice Charge",
          reference: inv.invoiceNumber,
          type: "CHARGE",
          amount: Number(inv.amountDue),
        });
      }
    });

    // Add Finances (Payments/In)
    data.finances?.forEach((fin) => {
      // Exclude soft-deleted (archived) payments if they exist
      if (!fin.isArchived) {
        entries.push({
          id: `pay-${fin.id}`,
          date: new Date(fin.paymentDate),
          description: fin.notes || `Payment - ${fin.paymentType.replace(/_/g, " ")}`,
          reference: fin.receiptNumber,
          type: "PAYMENT",
          amount: Number(fin.amountPaid),
        });
      }
    });

    // Sort chronologically (oldest first)
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    let currentBalance = 0;
    const computedEntries = entries.map((entry) => {
      if (entry.type === "CHARGE") {
        currentBalance += entry.amount;
      } else if (entry.type === "PAYMENT") {
        currentBalance -= entry.amount;
      }
      return {
        ...entry,
        runningBalance: currentBalance,
      };
    });

    return computedEntries;
  }, [data]);

  const currentOwed = statementData.length > 0 ? statementData[statementData.length - 1].runningBalance : 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold">Account Statement</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Running balance and transaction history.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm text-muted-foreground block">Current Balance</span>
            <span className={`text-lg font-bold ${currentOwed > 0 ? "text-red-500" : "text-green-600"}`}>
              KES {currentOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <ExportDropdown
            filename={`${data.firstName}_${data.lastName}_Statement`}
            headers={["Date", "Description", "Reference", "Charge (Out)", "Payment (In)", "Running Balance"]}
            rows={statementData.map((row) => [
              format(row.date, "MMM dd, yyyy"),
              row.description,
              row.reference,
              row.type === "CHARGE" ? row.amount.toString() : "",
              row.type === "PAYMENT" ? row.amount.toString() : "",
              row.runningBalance.toString(),
            ])}
          />
        </div>
      </CardHeader>
      <CardContent>
        {statementData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No financial records found for this athlete.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right text-red-600/80">Charge (Out)</TableHead>
                  <TableHead className="text-right text-green-600/80">Payment (In)</TableHead>
                  <TableHead className="text-right font-bold">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(entry.date, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{entry.description}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {entry.type.toLowerCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {entry.reference}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {entry.type === "CHARGE" ? `KES ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {entry.type === "PAYMENT" ? `KES ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      KES {entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
}
