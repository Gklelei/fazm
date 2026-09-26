"use client";

import * as React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoader } from "@/utils/Alerts/PageLoader";
import { AlertCircle } from "lucide-react";

type Period = "" | "W" | "M" | "Y";

type Finance = {
  id: string;
  athleteId: string | null;
  amountPaid: number | null;
  paymentDate: string | null;
  paymentType: string | null;
  receiptNumber: string | null;
};

type Invoice = {
  id: string;
  athleteId: string | null;
  invoiceNumber: string | null;
  amountDue: number | string | null;
  status: string | null;
  dueDate: string | null;
};

type PageMeta = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type StatsResponse = {
  transactions: { data: Finance[]; meta: PageMeta };
  dueInvoices: { data: Invoice[]; meta: PageMeta };
  summary: {
    totalDueAmount: number;
    totalDueInvoices: number;
    period: string;
  };
};

const PERIODS: { label: string; value: Period }[] = [
  { label: "All time", value: "" },
  { label: "This week", value: "W" },
  { label: "This month", value: "M" },
  { label: "This year", value: "Y" },
];

const PAGE_SIZE = 10;

export default function StatsPage() {
  const [period, setPeriod] = React.useState<Period>("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<StatsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (period) params.set("period", period);

        const res = await fetch(`/api/stats?${params.toString()}`);
        const json = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(json?.error || "Failed to load statistics.");
          setData(null);
        } else {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load statistics.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [period, page]);

  const changePeriod = (next: Period) => {
    setPeriod(next);
    setPage(1);
  };

  if (loading && !data) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Unable to load statistics</h2>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value || "all"}
              size="sm"
              variant={period === p.value ? "default" : "outline"}
              onClick={() => changePeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              KES {Number(data.summary.totalDueAmount).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.summary.totalDueInvoices}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions {period ? `(${period})` : "(All time)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.transactions.meta.totalItems}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">
                      {t.athleteId ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      KES {Number(t.amountPaid ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {t.paymentDate
                        ? format(new Date(t.paymentDate), "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {(t.paymentType ?? "").replace(/_/g, " ") || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.receiptNumber ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {data.transactions.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transactions for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Athlete ID</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.dueInvoices.data.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.invoiceNumber ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {inv.athleteId ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      KES {Number(inv.amountDue ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {inv.dueDate
                        ? format(new Date(inv.dueDate), "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        {inv.status ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.dueInvoices.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No overdue invoices.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={
            !data.transactions.meta.hasNextPage &&
            !data.dueInvoices.meta.hasNextPage
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}
