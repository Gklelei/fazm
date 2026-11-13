"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Ban, FileDown, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { cancelSale } from "../actions/shop";
import type { SaleDetail } from "../queries";
import { paidBy, SaleStatusBadge } from "./ShopPage";
import { athletePath } from "@/features/athletes/lib/athlete-links";

function CancelDialog({ sale }: { sale: SaleDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const res = await cancelSale(sale.saleNumber, reason);
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Ban /> Cancel sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel {sale.saleNumber}?</DialogTitle>
          <DialogDescription>
            The items go back into stock.
            {sale.invoice ? ` Invoice ${sale.invoice.invoiceNumber} is cancelled too.` : " Give the money back separately."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Input id="cancel-reason" placeholder="e.g. wrong size, returned" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button variant="destructive" disabled={pending} onClick={submit}>
            {pending && <Loader2 className="animate-spin" />} Cancel sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SaleView({ sale }: { sale: SaleDetail }) {
  const rows: [string, React.ReactNode][] = [
    ["Date", formatAcademy(sale.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })],
    [
      "Customer",
      sale.athleteId ? (
        <Link href={athletePath(sale.athleteId)} className="text-primary hover:underline">
          {sale.customer}
        </Link>
      ) : (
        (sale.customer ?? "Walk-in")
      ),
    ],
    ["Paid by", paidBy(sale)],
    ...(sale.reference ? ([["Reference", <span key="r" className="font-mono">{sale.reference}</span>]] as [string, React.ReactNode][]) : []),
    ...(sale.invoice
      ? ([
          [
            "Invoice",
            <Link key="i" href={`/invoices/${sale.invoice.invoiceNumber}`} className="font-mono text-primary hover:underline">
              {sale.invoice.invoiceNumber}
            </Link>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    ["Served by", sale.soldBy ?? "—"],
  ];
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/shop?tab=sales">
          <ArrowLeft /> Sales
        </Link>
      </Button>
      <PageHeader
        title={<span className="font-mono">{sale.saleNumber}</span>}
        description={<SaleStatusBadge status={sale.status} />}
        actions={
          <>
            {sale.status !== "CANCELLED" && <CancelDialog sale={sale} />}
            <Button variant="outline" asChild>
              <a href={`/api/shop/sales/${sale.saleNumber}/receipt`} target="_blank" rel="noopener">
                <FileDown /> Receipt
              </a>
            </Button>
            <Button asChild>
              <Link href="/shop/new">
                <ShoppingCart /> New sale
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4 font-medium">{l.description}</TableCell>
                  <TableCell className="tabular text-right">{l.quantity}</TableCell>
                  <TableCell className="tabular text-right">{formatCurrency(l.unitPrice)}</TableCell>
                  <TableCell className="tabular pr-4 text-right">{formatCurrency(l.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="pl-4 font-semibold">
                  Total
                </TableCell>
                <TableCell className="tabular pr-4 text-right font-bold">{formatCurrency(sale.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </section>
        <aside className="space-y-3 rounded-lg border bg-card p-4">
          <dl className="grid gap-3">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {sale.notes && <p className="border-t pt-3 text-sm whitespace-pre-line text-muted-foreground">{sale.notes}</p>}
        </aside>
      </div>
    </div>
  );
}
