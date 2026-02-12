"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/utils/Debounce";
import { formatCurrency } from "@/utils/TansformWords";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { EditInvoiceStatus } from "../Server/EditInvoice";
import { AllInvoicesType } from "../Types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RotateCcw,
  FilterIcon,
  Loader2,
  Plus,
  FileDown,
  Eye,
  PenBoxIcon,
  ChevronDown,
} from "lucide-react";
import { PageLoader } from "@/utils/Alerts/PageLoader";
import ApplyCoupon from "./ApplyCoupon";
import { cn } from "@/lib/utils";

interface Props {
  initialData: {
    pages: Array<{ items: AllInvoicesType[]; nextCursor: string | null }>;
    pageParams: (string | null)[];
  };
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "PAID":
      return "bg-emerald-100/80 text-emerald-800 border-emerald-200";
    case "PARTIAL":
      return "bg-amber-100/80 text-amber-800 border-amber-200";
    case "PENDING":
      return "bg-blue-100/80 text-blue-800 border-blue-200";
    case "OVERDUE":
      return "bg-rose-100/80 text-rose-800 border-rose-200";
    case "CANCELED":
      return "bg-zinc-100/80 text-zinc-800 border-zinc-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const money = (n: number) => `KES ${formatCurrency(n)}`;

const Invoices = ({ initialData }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string>("");

  const debounceSearch = useDebounce(searchQuery, 800);
  const router = useRouter();
  const { inView, ref } = useInView();

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      initialData:
        debounceSearch === "" && !statusFilter ? initialData : undefined,
      initialPageParam: null as string | null,
      queryKey: ["INVOICES", debounceSearch, statusFilter],
      queryFn: async ({ pageParam }) => {
        const url = new URL("/api/invoices", window.location.origin);
        url.searchParams.set("pageSize", "10");
        url.searchParams.set("search", debounceSearch);
        if (statusFilter) url.searchParams.set("status", statusFilter);
        if (pageParam) url.searchParams.set("cursor", pageParam);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const invoices = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data?.pages]);

  useEffect(() => {
    if (inView && hasNextPage) fetchNextPage();
  }, [inView, hasNextPage, fetchNextPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
  };

  const handleChangeInvoiceStatus = async (
    value: "PENDING" | "CANCELED",
    invoiceNumber: string,
  ) => {
    setStatusId(invoiceNumber);
    const result = await EditInvoiceStatus(value, invoiceNumber);

    if (result.success) {
      Sweetalert({
        icon: "success",
        text: result.message || "Updated",
        title: "Success!",
      });
    } else {
      Sweetalert({
        icon: "error",
        text: result.message || "Failed",
        title: "Error",
      });
    }

    setStatusId("");
  };

  if (isLoading && !isFetchingNextPage) return <PageLoader />;

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 md:p-6">
      <Card className="w-full border-border/40 bg-card/60 shadow-sm backdrop-blur-sm">
        <CardHeader className="px-5 pb-4 pt-5 md:px-6 md:pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight md:text-2xl">
                Billing & Invoices
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Overview of athlete billing cycles and payment status
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                className="h-10 gap-2 px-4 font-medium shadow-sm hover:shadow-md"
                onClick={() => router.push("/finances/invoice/create")}
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                placeholder="Search invoice #, athlete name, or athlete ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full bg-background pl-11 transition-colors hover:border-input focus:border-primary focus:ring-1 focus:ring-primary/20 sm:max-w-md"
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 gap-2 border-input/60 px-4 hover:border-input hover:bg-accent/50"
                  >
                    <FilterIcon className="h-4 w-4" />
                    {statusFilter ? (
                      <span className="font-medium">{statusFilter}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        All Statuses
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-semibold">
                    Filter by status
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter(null)}
                      className="cursor-pointer focus:bg-accent/50"
                    >
                      <span className="text-muted-foreground">
                        Clear Filter
                      </span>
                    </DropdownMenuItem>
                    {["PENDING", "PARTIAL", "PAID", "CANCELED", "OVERDUE"].map(
                      (status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className="cursor-pointer focus:bg-accent/50"
                        >
                          {status}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {(searchQuery || statusFilter) && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="h-11 px-4 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 md:px-6 md:pb-6">
          {/* ✅ Mobile cards */}
          <div className="space-y-3 md:hidden">
            {invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                  <FileDown className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No invoices found
                </p>
                {(searchQuery || statusFilter) && (
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Try adjusting your search or filters
                  </p>
                )}
              </div>
            ) : (
              invoices.map((invoice) => {
                const amountDue = Number(invoice.amountDue ?? 0);
                const discount = Number(invoice.discount ?? 0);
                const amountPaid = Number(invoice.amountPaid ?? 0);
                const balance = amountDue - discount - amountPaid;

                return (
                  <Card
                    key={invoice.id}
                    className="rounded-2xl border-border/50"
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-mono text-sm font-bold">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(
                              invoice.subscriptionPlan?.code || invoice.type
                            ).toUpperCase()}
                            _INVOICE
                          </div>
                        </div>

                        <Badge
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            statusBadgeClass(invoice.status),
                          )}
                        >
                          {invoice.status}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-semibold">
                          {invoice.athlete.firstName} {invoice.athlete.lastName}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {invoice.athleteId}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-3">
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Due
                          </div>
                          <div className="font-mono text-sm font-semibold">
                            {money(amountDue)}
                          </div>
                        </div>

                        <div className="space-y-1 text-right">
                          <div className="text-[11px] text-muted-foreground">
                            Discount
                          </div>
                          <div className="font-mono text-sm font-semibold">
                            {money(discount)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            Paid
                          </div>
                          <div className="font-mono text-sm font-semibold text-emerald-700">
                            {money(amountPaid)}
                          </div>
                        </div>

                        <div className="space-y-1 text-right">
                          <div className="text-[11px] text-muted-foreground">
                            Balance
                          </div>
                          <div
                            className={cn(
                              "font-mono text-sm font-bold",
                              balance <= 0 && "text-emerald-700",
                            )}
                          >
                            {money(Math.max(balance, 0))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <ApplyCoupon
                          status={invoice.status}
                          invoiceNumber={invoice.invoiceNumber}
                          balance={balance}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() =>
                            router.push(`/finances/invoice/${invoice.id}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg hover:bg-blue-100/50 hover:text-blue-600"
                          onClick={() =>
                            router.push(
                              `/finances/invoice/${invoice.invoiceNumber}/edit`,
                            )
                          }
                        >
                          <PenBoxIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* ✅ Desktop table */}
          <div className="hidden rounded-xl border border-border/40 shadow-sm md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      #
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Invoice Info
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Athlete
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount Due
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Discount
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount Paid
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Balance
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-14 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
                            <FileDown className="h-6 w-6 text-muted-foreground/60" />
                          </div>
                          <p className="font-medium text-muted-foreground">
                            No invoices found
                          </p>
                          {(searchQuery || statusFilter) && (
                            <p className="text-sm text-muted-foreground/70">
                              Try adjusting your search or filters
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice, i) => {
                      const amountDue = Number(invoice.amountDue ?? 0);
                      const discount = Number(invoice.discount ?? 0);
                      const amountPaid = Number(invoice.amountPaid ?? 0);

                      // ✅ correct balance
                      const balance = amountDue - discount - amountPaid;

                      const isUpdating = statusId === invoice.invoiceNumber;

                      return (
                        <TableRow
                          key={invoice.id}
                          className="group border-b border-border/20 transition-colors hover:bg-accent/30 last:border-b-0"
                        >
                          <TableCell className="py-4 text-center text-sm font-medium text-muted-foreground/80">
                            {i + 1}
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-col space-y-1">
                              <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                                {invoice.invoiceNumber}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground/80">
                                {(
                                  invoice.subscriptionPlan?.code || invoice.type
                                ).toUpperCase()}
                                _INVOICE
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-semibold text-foreground">
                                {invoice.athlete.firstName}{" "}
                                {invoice.athlete.lastName}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground/70">
                                {invoice.athleteId}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4 text-right font-mono text-sm font-semibold text-foreground">
                            {money(amountDue)}
                          </TableCell>

                          <TableCell className="py-4 text-right font-mono text-sm font-semibold text-foreground">
                            {money(discount)}
                          </TableCell>

                          <TableCell className="py-4 text-right font-mono text-sm">
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              {money(amountPaid)}
                            </span>
                          </TableCell>

                          <TableCell className="py-4 text-right font-mono text-sm font-bold">
                            <span
                              className={cn(
                                balance > 0
                                  ? "text-foreground"
                                  : "text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {money(Math.max(balance, 0))}
                            </span>
                          </TableCell>

                          <TableCell className="py-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                disabled={
                                  invoice.status === "PAID" ||
                                  invoice.status === "PARTIAL"
                                }
                                className="rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1"
                              >
                                <Badge
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105",
                                    statusBadgeClass(invoice.status),
                                  )}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {invoice.status}
                                    {!(
                                      invoice.status === "PAID" ||
                                      invoice.status === "PARTIAL"
                                    ) && (
                                      <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                                    )}
                                  </div>
                                </Badge>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent className="w-44">
                                <DropdownMenuLabel className="text-xs font-semibold">
                                  Change Status
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(["PENDING", "CANCELED"] as const).map(
                                  (status) => (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={() =>
                                        handleChangeInvoiceStatus(
                                          status,
                                          invoice.invoiceNumber,
                                        )
                                      }
                                      disabled={isUpdating}
                                      className="cursor-pointer text-sm focus:bg-accent/50"
                                    >
                                      {isUpdating ? (
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          <span>Updating...</span>
                                        </div>
                                      ) : (
                                        status
                                      )}
                                    </DropdownMenuItem>
                                  ),
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>

                          <TableCell className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* ✅ correct props */}
                              <ApplyCoupon
                                status={invoice.status}
                                invoiceNumber={invoice.invoiceNumber}
                                balance={balance}
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                                onClick={() =>
                                  router.push(`/finances/invoice/${invoice.id}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg hover:bg-blue-100/50 hover:text-blue-600"
                                onClick={() =>
                                  router.push(
                                    `/finances/invoice/${invoice.invoiceNumber}/edit`,
                                  )
                                }
                              >
                                <PenBoxIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Infinite loader */}
          <div ref={ref} className="flex h-20 items-center justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">
                  Loading more invoices...
                </span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
