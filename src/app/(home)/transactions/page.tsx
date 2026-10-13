import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { formatCurrency } from "@/lib/format";
import { athleteName } from "@/features/athletes/lib/names";
import { PaymentRowActions } from "@/features/finance/components/PaymentRowActions";
import { PaymentsToolbar } from "@/features/finance/components/PaymentsToolbar";
import { METHOD_LABEL } from "@/features/finance/lib/methods";
import { RecordPaymentDialog } from "@/features/finance/components/RecordPaymentDialog";
import { listPayments, parsePaymentParams } from "@/features/finance/queries/list-payments";

export const metadata: Metadata = { title: "Payments" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = parsePaymentParams(sp);
  const { rows, total, sum, pages } = await listPayments(params);
  const filtered = !!(params.search || params.method || params.from || params.to);

  const pageHref = (page: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1]));
    q.set("page", String(page));
    return `/transactions?${q}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Every fee payment received, with its receipt number. Recording one updates the invoice it pays."
        actions={<RecordPaymentDialog />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={filtered ? "Matching payments" : "Payments recorded"} value={total} />
        <StatCard label={filtered ? "Total of these" : "Total received"} value={formatCurrency(sum)} tone="success" />
      </div>

      <section className="overflow-hidden rounded-lg border bg-card">
        <PaymentsToolbar />

        {rows.length === 0 ? (
          <p className="px-4 py-16 text-center font-medium">
            {filtered ? "No payments match these filters." : "No payments recorded yet."}
          </p>
        ) : (
          <>
            <ul className="divide-y md:hidden">
              {rows.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium">{athleteName(p.athlete)}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(p.paymentDate, "d MMM yyyy")} · {METHOD_LABEL[p.paymentType]}
                    </p>
                  </div>
                  <div className="flex items-start gap-1">
                    <p className="tabular font-mono text-sm font-semibold">{formatCurrency(p.amountPaid)}</p>
                    <PaymentRowActions payment={p} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Receipt</TableHead>
                    <TableHead>Paid on</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Received by</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4">
                        <span className="grid leading-tight">
                          <span className="font-mono text-sm">{p.receiptNumber}</span>
                          {p.notes && <span className="truncate text-xs text-muted-foreground">{p.notes}</span>}
                        </span>
                      </TableCell>
                      <TableCell className="tabular whitespace-nowrap">{format(p.paymentDate, "d MMM yyyy")}</TableCell>
                      <TableCell>
                        <Link href={`/players/user-profile/${p.athlete.athleteId}`} className="grid leading-tight hover:underline">
                          <span className="truncate">{athleteName(p.athlete)}</span>
                          <span className="font-mono text-xs text-muted-foreground">{p.athlete.athleteId}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {p.invoice ? (
                          <Link href={`/invoices/${p.invoice.id}`} className="font-mono text-sm hover:underline">
                            {p.invoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{METHOD_LABEL[p.paymentType]}</TableCell>
                      <TableCell className="text-muted-foreground">{p.collectedBy}</TableCell>
                      <TableCell className="tabular text-right font-mono font-semibold">{formatCurrency(p.amountPaid)}</TableCell>
                      <TableCell className="pr-4 text-right"><PaymentRowActions payment={p} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {pages > 1 && (
          <footer className="flex items-center justify-end gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(params.page - 1)} aria-disabled={params.page <= 1} className={params.page <= 1 ? "pointer-events-none opacity-50" : ""}>
                <ChevronLeft /> Previous
              </Link>
            </Button>
            <span className="tabular">{params.page} / {pages}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(params.page + 1)} aria-disabled={params.page >= pages} className={params.page >= pages ? "pointer-events-none opacity-50" : ""}>
                Next <ChevronRight />
              </Link>
            </Button>
          </footer>
        )}
      </section>
    </div>
  );
}
