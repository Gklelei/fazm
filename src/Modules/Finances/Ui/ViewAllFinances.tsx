"use client";

import * as React from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { CreditCard, Search, Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";

import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import TransactionDetails from "./TransactionDetails";
import PaymentModal from "./PaymentModal";
import {
  FinancesTypes,
  GetAllFinanceAtheletesType,
  GetAllInvoicesType,
} from "../Type";

const ViewAllFinances = ({
  data,
  athletes,
  invoices,
}: {
  data: FinancesTypes[];
  invoices: GetAllInvoicesType[];
  athletes: GetAllFinanceAtheletesType[];
}) => {
  // --- State for Filters ---
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  // --- Filtering Logic ---
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      // 1. Text Search (Name, Athlete ID, Receipt, or Invoice Number)
      const searchStr = searchQuery.toLowerCase();
      const matchesText =
        item.athlete.firstName.toLowerCase().includes(searchStr) ||
        item.athlete.lastName.toLowerCase().includes(searchStr) ||
        item.athleteId.toLowerCase().includes(searchStr) ||
        item.receiptNumber.toLowerCase().includes(searchStr) ||
        item.invoice?.invoiceNumber?.toLowerCase().includes(searchStr);

      // 2. Date Range Filter
      let matchesDate = true;
      if (dateRange?.from) {
        const paymentDate = new Date(item.paymentDate);
        const start = startOfDay(dateRange.from);
        const end = dateRange.to
          ? endOfDay(dateRange.to)
          : endOfDay(dateRange.from);

        matchesDate = isWithinInterval(paymentDate, { start, end });
      }

      return matchesText && matchesDate;
    });
  }, [data, searchQuery, dateRange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Financial Records
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {filteredData.length} of {data.length} transactions
            </p>
          </div>
          <PaymentModal athletes={athletes} invoices={invoices} />
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
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {(searchQuery || dateRange?.from) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setDateRange(undefined);
                }}
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
                <TableHead className="text-center w-20 text-xs font-bold uppercase">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((trans, i) => (
                <TableRow key={trans.id}>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {i + 1}
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
                    KES {trans.amountPaid.toLocaleString()}
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
                    <TransactionDetails id={trans.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed rounded-lg mt-4">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-900">
              No results found
            </h3>
            <p className="text-sm text-muted-foreground max-w-62.5 mx-auto mt-1">
              Try adjusting your search query or date range filter.
            </p>
            {(searchQuery || dateRange?.from) && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery("");
                  setDateRange(undefined);
                }}
                className="mt-4 text-primary"
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ViewAllFinances;
