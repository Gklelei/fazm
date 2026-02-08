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

interface Props {
  initialData: {
    pages: Array<{ items: AllInvoicesType[]; nextCursor: string | null }>;
    pageParams: (string | null)[];
  };
}

const Invoices = ({ initialData }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string>("");
  const debounceSearch = useDebounce(searchQuery, 1000);
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
    <div className="p-4 md:p-6 space-y-6 max-w-screen-2xl mx-auto">
      <Card className="w-full shadow-sm border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Billing & Invoices
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Overview of athlete billing cycles and payment status
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="default"
                className="h-10 gap-2 px-4 font-medium shadow-sm hover:shadow-md transition-shadow"
                onClick={() => router.push("/finances/invoice/create")}
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border/60">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
              <Input
                placeholder="Search invoice #, athlete name, or athlete ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 w-full sm:max-w-md bg-background border-input/60 hover:border-input focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 gap-2 border-input/60 hover:bg-accent/50 hover:border-input px-4"
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
                  <DropdownMenuLabel className="font-semibold text-foreground">
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
                  className="h-11 px-4 text-muted-foreground hover:text-foreground hover:bg-accent/50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <div className="rounded-xl border border-border/40 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border/40">
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
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
                          <FileDown className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        <p className="text-muted-foreground font-medium">
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
                    const balance =
                      Number(invoice.amountDue) - Number(invoice.amountPaid);
                    const isUpdating = statusId === invoice.invoiceNumber;

                    return (
                      <TableRow
                        key={invoice.id}
                        className="hover:bg-accent/30 transition-colors duration-150 border-b border-border/20 last:border-b-0 group"
                      >
                        <TableCell className="text-center text-muted-foreground/80 font-medium text-sm py-4">
                          {i + 1}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col space-y-1">
                            <span className="font-mono font-bold text-foreground text-sm tracking-tight">
                              {invoice.invoiceNumber}
                            </span>
                            <span className="text-xs text-muted-foreground/80 font-medium">
                              {(
                                invoice.subscriptionPlan?.code || invoice.type
                              ).toUpperCase()}
                              _INVOICE
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col space-y-1">
                            <span className="font-semibold text-foreground text-sm">
                              {invoice.athlete.firstName}{" "}
                              {invoice.athlete.lastName}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground/70">
                              {invoice.athleteId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-foreground py-4">
                          KES {formatCurrency(Number(invoice.amountDue))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm py-4">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            KES {formatCurrency(Number(invoice.amountPaid))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold py-4">
                          <span
                            className={
                              balance > 0
                                ? "text-foreground"
                                : "text-green-600 dark:text-green-400"
                            }
                          >
                            KES {formatCurrency(balance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              disabled={
                                invoice.status === "PAID" ||
                                invoice.status === "PARTIAL"
                              }
                              className="focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded-md transition-all"
                            >
                              <Badge
                                variant="secondary"
                                className={`
                                  font-semibold text-xs px-3 py-1.5 rounded-full 
                                  transition-all duration-200 hover:scale-105
                                  ${
                                    invoice.status === "PAID"
                                      ? "bg-green-100/80 text-green-800 border-green-200"
                                      : invoice.status === "PARTIAL"
                                        ? "bg-amber-100/80 text-amber-800 border-amber-200"
                                        : invoice.status === "PENDING"
                                          ? "bg-blue-100/80 text-blue-800 border-blue-200"
                                          : "bg-red-100/80 text-red-800 border-red-200"
                                  }
                                `}
                              >
                                <div className="flex items-center gap-1.5">
                                  {invoice.status.toLowerCase()}
                                  {!(
                                    invoice.status === "PAID" ||
                                    invoice.status === "PARTIAL"
                                  ) && (
                                    <ChevronDown className="h-3 w-3 opacity-70 ml-1" />
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
                                    {isUpdating &&
                                    statusId === invoice.invoiceNumber ? (
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin h-3 w-3" />
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
                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() =>
                                router.push(`/finances/invoice/${invoice.id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-blue-100/50 hover:text-blue-600 transition-colors"
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

          <div ref={ref} className="h-20 flex justify-center items-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin h-5 w-5" />
                <span className="text-sm font-medium">
                  Loading more invoices...
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
