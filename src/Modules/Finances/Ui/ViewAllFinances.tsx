"use client";

import * as React from "react";
import { format } from "date-fns";
import { Search, Calendar as CalendarIcon, X, Trash2 } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import TransactionDetails from "./TransactionDetails";
import PaymentModal from "./PaymentModal";
import {
  FinancesTypes,
  GetAllFinanceAtheletesType,
  GetAllInvoicesType,
} from "../Type";
import ExportDropdown from "@/utils/ExportDropdown";
import EditTransactionModal from "./EditTransactionModal";
import deleteFinancialTransaction from "../Server/DeleteTransaction";
import Swal from "sweetalert2";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useDebounce } from "@/utils/Debounce";

const ViewAllFinances = ({
  data,
  athletes,
  invoices,
  page,
  pageSize,
  total,
  initialSearch,
  initialFrom,
  initialTo,
}: {
  data: FinancesTypes[];
  invoices: GetAllInvoicesType[];
  athletes: GetAllFinanceAtheletesType[];
  page: number;
  pageSize: number;
  total: number;
  initialSearch: string;
  initialFrom: string;
  initialTo: string;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- State for Filters (initialized from, and kept in sync with, the URL
  // so search/date-range/page are all resolved server-side against the
  // full table rather than filtering an entire unpaginated table client-side) ---
  const [searchQuery, setSearchQuery] = React.useState(initialSearch);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    initialFrom
      ? {
          from: new Date(initialFrom),
          to: initialTo ? new Date(initialTo) : undefined,
        }
      : undefined,
  );

  const debouncedSearch = useDebounce(searchQuery, 400);
  const isFirstRender = React.useRef(true);

  const updateQuery = React.useCallback(
    (
      updates: Record<string, string | null>,
      options?: { resetPage?: boolean },
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      if (options?.resetPage !== false) {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    updateQuery({ search: debouncedSearch || null });
    // Only re-run when the debounced search value itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    updateQuery({
      from: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      to: range?.to
        ? format(range.to, "yyyy-MM-dd")
        : range?.from
          ? format(range.from, "yyyy-MM-dd")
          : null,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateRange(undefined);
    updateQuery({ search: null, from: null, to: null });
  };

  const totalPages = Math.ceil(total / pageSize);

  const goToPage = (nextPage: number) => {
    updateQuery(
      { page: String(Math.min(Math.max(1, nextPage), totalPages)) },
      { resetPage: false },
    );
  };

  const exportUrl = React.useMemo(() => {
    const params = new URLSearchParams({ resource: "finance" });
    if (searchQuery) params.set("query", searchQuery);
    if (dateRange?.from) {
      params.set("from", format(dateRange.from, "yyyy-MM-dd"));
      params.set(
        "to",
        format(dateRange.to ?? dateRange.from, "yyyy-MM-dd"),
      );
    }
    return `/api/export?${params.toString()}`;
  }, [searchQuery, dateRange]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You are about to delete this transaction. This cannot be  reversed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      const res = await deleteFinancialTransaction(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Financial Records
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {data.length} of {total} transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportDropdown
              filename="Transactions"
              headers={[
                "#",
                "Athlete",
                "Amount",
                "Payment Date",
                "Invoice #",
                "Method",
                "Receipt #",
              ]}
              rows={data.map((t, i) => [
                String((page - 1) * pageSize + i + 1),
                `${t.athlete.firstName} ${t.athlete.lastName}`,
                `KES ${Number(t.amountPaid).toLocaleString()}`,
                format(new Date(t.paymentDate), "MMM dd, yyyy"),
                t.invoice?.invoiceNumber || "—",
                t.paymentType.replace(/_/g, " "),
                t.receiptNumber,
              ])}
              fetchAllUrl={exportUrl}
              filterFn={(t: FinancesTypes) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  t.athlete.firstName.toLowerCase().includes(q) ||
                  t.athlete.lastName.toLowerCase().includes(q) ||
                  t.athleteId.toLowerCase().includes(q) ||
                  t.receiptNumber.toLowerCase().includes(q) ||
                  !!t.invoice?.invoiceNumber?.toLowerCase().includes(q)
                );
              }}
              mapRow={(t: FinancesTypes, i: number) => [
                String(i + 1),
                `${t.athlete.firstName} ${t.athlete.lastName}`,
                `KES ${Number(t.amountPaid).toLocaleString()}`,
                format(new Date(t.paymentDate), "MMM dd, yyyy"),
                t.invoice?.invoiceNumber || "—",
                t.paymentType.replace(/_/g, " "),
                t.receiptNumber,
              ]}
            />
            <PaymentModal athletes={athletes} invoices={invoices} />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, invoice #, or receipt..."
              className="pl-10 h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-65 h-11 justify-start text-left font-normal ",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {(searchQuery || dateRange?.from) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-11 px-3"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border  overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead className="text-center w-36 text-xs font-bold uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((trans, i) => (
                <TableRow key={trans.id}>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {(page - 1) * pageSize + i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ProfileAvatar
                        name={`${trans.athlete.firstName} ${trans.athlete.lastName}`}
                        url={trans.athlete.profilePIcture || ""}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold leading-none">
                          {trans.athlete.firstName} {trans.athlete.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          ID: {trans.athleteId}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold ">
                    KES {Number(trans.amountPaid).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {format(new Date(trans.paymentDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium ">
                    {trans.invoice?.invoiceNumber || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className=" border-none px-2 py-0 text-[10px] uppercase tracking-wider"
                    >
                      {trans.paymentType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">{trans.receiptNumber}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <TransactionDetails id={trans.id} />
                      <EditTransactionModal data={trans} />
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(trans.id)}
                        className="h-9 w-9 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.length === 0 && (
          <Empty className="mt-4 border-2">
            <EmptyMedia>
              <Search className="h-10 w-10 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No results found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search query or date range filter.
            </EmptyDescription>
            {(searchQuery || dateRange?.from) && (
              <Button variant="link" onClick={clearFilters} className="text-primary">
                Clear all filters
              </Button>
            )}
          </Empty>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, total)} of {total} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViewAllFinances;
