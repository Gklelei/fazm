"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { format, isPast } from "date-fns";
import { FilePlus2, Loader2, RefreshCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { athleteName } from "@/features/athletes/lib/names";
import type { InvoiceFilters, InvoiceListRow, InvoicesPage } from "../queries/list";
import { InvoiceRowActions } from "./InvoiceRowActions";

const ALL = "all";
const STATUSES = ["PENDING", "PARTIAL", "OVERDUE", "PAID", "CANCELED"] as const;
const EMPTY = { search: "", status: "", from: "", to: "" };

type ExportInvoice = Omit<InvoiceListRow, "amountDue" | "amountPaid"> & {
  amountDue: string | number;
  amountPaid: string | number;
};

const params = (f: InvoiceFilters) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p;
};

/** Balance, red when the invoice is overdue. */
function Balance({ invoice }: { invoice: InvoiceListRow }) {
  const balance = Math.max(invoice.amountDue - invoice.amountPaid, 0);
  if (invoice.status === "CANCELED") return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn(balance > 0 && invoice.status === "OVERDUE" && "text-destructive", balance === 0 && "text-muted-foreground")}>
      {formatCurrency(balance)}
    </span>
  );
}

export default function InvoicesBoard({
  initialData,
}: {
  initialData: InfiniteData<InvoicesPage, string>;
}) {
  const [form, setForm] = useState(EMPTY);
  const search = useDebounce(form.search, 400);
  const filters = useMemo<InvoiceFilters>(
    () => ({
      search: search.trim() || undefined,
      status: (form.status || undefined) as InvoiceFilters["status"],
      from: form.from || undefined,
      to: form.to || undefined,
    }),
    [search, form.status, form.from, form.to],
  );
  const filtered = Object.values(filters).some(Boolean);

  const { data, isPending, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ["invoices", filters],
      initialData: filtered ? undefined : initialData,
      initialPageParam: "",
      queryFn: async ({ pageParam }): Promise<InvoicesPage> => {
        const p = params(filters);
        if (pageParam) p.set("cursor", pageParam);
        const res = await fetch(`/api/invoices?${p}`);
        if (!res.ok) throw new Error("Couldn't load invoices");
        return res.json();
      },
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const invoices = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const summary = data?.pages[0]?.summary;

  const { ref, inView } = useInView({ rootMargin: "400px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Fees billed to athletes. Payments are recorded against an invoice and update its balance."
        actions={
          <>
            <ExportDropdown<ExportInvoice>
              filename="Invoices"
              headers={["Invoice", "Issued", "Due", "Athlete", "Athlete ID", "For", "Due (KES)", "Paid (KES)", "Balance (KES)", "Status"]}
              rows={[]}
              fetchAllUrl={`/api/export?resource=invoices&${params(filters)}`}
              mapRow={(i) => [
                i.invoiceNumber,
                format(new Date(i.createdAt), "dd MMM yyyy"),
                format(new Date(i.dueDate), "dd MMM yyyy"),
                athleteName(i.athlete),
                i.athlete.athleteId,
                i.subscriptionPlan?.name ?? i.description ?? "",
                String(Number(i.amountDue)),
                String(Number(i.amountPaid)),
                String(Math.max(Number(i.amountDue) - Number(i.amountPaid), 0)),
                i.status,
              ]}
            />
            <Button asChild>
              <Link href="/invoices/create">
                <FilePlus2 /> New invoice
              </Link>
            </Button>
          </>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label={filtered ? "Matching invoices" : "Open & settled invoices"} value={summary.count} />
          <StatCard label="Collected" value={formatCurrency(summary.paid)} tone="success" />
          <StatCard
            label="Still owed"
            value={formatCurrency(Math.max(summary.due - summary.paid, 0))}
            tone={summary.due > summary.paid ? "danger" : "default"}
            className="col-span-2 lg:col-span-1"
          />
        </div>
      )}

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(14rem,1fr)_auto]">
          <div className="relative self-end">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search invoices"
              placeholder="Search invoice number, athlete name or ID"
              className="pr-9 pl-9"
              value={form.search}
              onChange={(e) => setForm((f) => ({ ...f, search: e.target.value }))}
            />
            {isFetching && !isFetchingNextPage && (
              <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="col-span-2 grid gap-1.5 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status || ALL} onValueChange={(v) => setForm((f) => ({ ...f, status: v === ALL ? "" : v }))}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-from" className="text-xs text-muted-foreground">Issued from</Label>
              <Input id="inv-from" type="date" value={form.from} max={form.to || undefined} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-to" className="text-xs text-muted-foreground">to</Label>
              <Input id="inv-to" type="date" value={form.to} min={form.from || undefined} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
            </div>
            {filtered && (
              <Button variant="ghost" className="col-span-2 sm:col-span-1" onClick={() => setForm(EMPTY)}>
                <X /> Clear filters
              </Button>
            )}
          </div>
        </div>

        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">Invoices didn&apos;t load.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw /> Try again
            </Button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">{filtered ? "No invoices match these filters." : "No invoices yet."}</p>
            {filtered ? (
              <Button variant="outline" onClick={() => setForm(EMPTY)}>Clear filters</Button>
            ) : (
              <Button asChild>
                <Link href="/invoices/create"><FilePlus2 /> New invoice</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Phones: one card per invoice */}
            <ul className="divide-y md:hidden">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <Link href={`/invoices/${i.id}`} className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{athleteName(i.athlete)}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {i.invoiceNumber} · due {format(new Date(i.dueDate), "d MMM")}
                    </p>
                    <StatusBadge status={i.status} />
                  </Link>
                  <div className="flex items-start gap-1">
                    <p className="tabular font-mono text-sm font-semibold">
                      <Balance invoice={i} />
                    </p>
                    <InvoiceRowActions invoice={i} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Invoice</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i.id} className={cn(i.status === "CANCELED" && "text-muted-foreground")}>
                      <TableCell className="pl-4">
                        <Link href={`/invoices/${i.id}`} className="grid leading-tight hover:underline">
                          <span className="font-mono text-sm">{i.invoiceNumber}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {i.subscriptionPlan?.name ?? i.description ?? "Manual invoice"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/players/user-profile/${i.athlete.athleteId}`} className="grid leading-tight hover:underline">
                          <span className="truncate">{athleteName(i.athlete)}</span>
                          <span className="font-mono text-xs text-muted-foreground">{i.athlete.athleteId}</span>
                        </Link>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "tabular whitespace-nowrap",
                          i.status !== "PAID" && i.status !== "CANCELED" && isPast(new Date(i.dueDate)) && "text-destructive",
                        )}
                      >
                        {format(new Date(i.dueDate), "d MMM yyyy")}
                      </TableCell>
                      <TableCell className="tabular text-right font-mono">{formatCurrency(i.amountDue)}</TableCell>
                      <TableCell className="tabular text-right font-mono">{formatCurrency(i.amountPaid)}</TableCell>
                      <TableCell className="tabular text-right font-mono font-semibold"><Balance invoice={i} /></TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                      <TableCell className="pr-4 text-right"><InvoiceRowActions invoice={i} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div ref={ref} className="flex h-14 items-center justify-center border-t text-sm text-muted-foreground">
              {isFetchingNextPage ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading more</span>
              ) : hasNextPage ? (
                <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>Load more</Button>
              ) : (
                <span className="tabular">{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
