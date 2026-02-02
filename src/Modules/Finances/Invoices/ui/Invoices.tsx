"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AllInvoicesType } from "../Types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FilterIcon,
  FileDown,
  Plus,
  Search,
  RotateCcw,
  Eye,
  PenBoxIcon,
  Trash2Icon,
  BadgeCheckIcon,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/utils/TansformWords";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EditInvoiceStatus } from "../Server/EditInvoice";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

const Invoices = ({ data }: { data: AllInvoicesType[] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string>("");
  const router = useRouter();

  const filteredInvoices = useMemo(() => {
    return data.filter((invoice) => {
      const fullName =
        `${invoice.athlete.firstName} ${invoice.athlete.middleName ?? ""} ${invoice.athlete.lastName}`.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        fullName.includes(searchQuery.toLowerCase()) ||
        invoice.athleteId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter
        ? invoice.status === statusFilter
        : true;
      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

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
        text: result.message || "Invoice Status Updated",
        title: "Success!",
      });
    } else {
      Sweetalert({
        icon: "error",
        text: result.message || "Failed to update status",
        title: "An error has occurred",
      });
    }

    setStatusId("");
  };

  return (
    <div className="p-6 space-y-6 max-w-400 mx-auto">
      <Card className="w-full shadow-sm border-muted">
        <CardHeader className="pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Billing & Invoices
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Overview of athlete billing cycles, payments, and outstanding
                balances.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 gap-2 hidden"
              >
                <FileDown className="h-4 w-4" /> Export
              </Button>
              <Button
                size="sm"
                className="h-9 px-4 gap-2"
                onClick={() => router.push("/finances/invoice/create")}
              >
                <Plus className="h-4 w-4" /> Create Invoice
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-muted/60">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search invoice #, athlete..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 w-full sm:max-w-md bg-muted/20 border-muted"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 border-muted">
                    <FilterIcon className="h-4 w-4" />
                    {statusFilter ? statusFilter : "All Statuses"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                      Clear Filter
                    </DropdownMenuItem>
                    {["PENDING", "PARTIAL", "PAID", "CANCELED", "OVERDUE"].map(
                      (status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => setStatusFilter(status)}
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
                  className="h-10 px-3 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <div className="rounded-lg border border-muted overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs uppercase font-bold tracking-wider">
                    #
                  </TableHead>
                  <TableHead className="text-xs uppercase font-bold tracking-wider">
                    Invoice Info
                  </TableHead>
                  <TableHead className="text-xs uppercase font-bold tracking-wider">
                    Athlete
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold tracking-wider">
                    Amount Due
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold tracking-wider">
                    Paid
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold tracking-wider">
                    Balance
                  </TableHead>
                  <TableHead className="text-center text-xs uppercase font-bold tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs uppercase font-bold tracking-wider">
                    Due Date
                  </TableHead>
                  <TableHead className="text-right text-xs uppercase font-bold tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <div className="flex items-center justify-center p-12 m-6 border border-dashed rounded-lg">
                        <div className="text-center">
                          <p className="text-muted-foreground font-medium">
                            No invoices found
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            Adjust filters or create a new invoice to see
                            results here.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice, i) => {
                    const balance = invoice.amountDue - invoice.amountPaid;
                    const athleteFullName = [
                      invoice.athlete.firstName,
                      invoice.athlete.middleName,
                      invoice.athlete.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const isUpdatingThisInvoice =
                      statusId === invoice.invoiceNumber;

                    return (
                      <TableRow
                        key={invoice.id}
                        className="hover:bg-muted/20 transition-colors group"
                      >
                        <TableCell className="text-center text-muted-foreground text-xs">
                          {i + 1}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {invoice.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-muted-foreground tracking-tight italic capitalize">
                              {(
                                invoice.subscriptionPlan?.code || invoice.type
                              ).toUpperCase()}
                              _INVOICE
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-foreground">
                              {athleteFullName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {invoice.athleteId}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm">
                          <span className="text-[10px] mr-1 text-muted-foreground">
                            KES
                          </span>
                          {formatCurrency(invoice.amountDue)}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(invoice.amountPaid)}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm font-bold">
                          <span
                            className={
                              balance > 0
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                            }
                          >
                            {formatCurrency(balance)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              disabled={
                                invoice.status === "PAID" ||
                                invoice.status === "PARTIAL"
                              }
                              className="disabled:cursor-default"
                            >
                              <Badge
                                variant="secondary"
                                className={`
                    font-bold text-[11px] px-3 py-0.5 transition-colors duration-200
                    ${
                      invoice.status === "PAID"
                        ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                        : invoice.status === "PARTIAL"
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200"
                          : invoice.status === "PENDING"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                    }
                    ${
                      !(
                        invoice.status === "PAID" ||
                        invoice.status === "PARTIAL"
                      ) && "border-dashed border-2"
                    }
                  `}
                              >
                                <div className="flex items-center gap-1.5">
                                  {invoice.status.toLowerCase()}
                                  {!(
                                    invoice.status === "PAID" ||
                                    invoice.status === "PARTIAL"
                                  ) && (
                                    <ChevronDown className="h-3 w-3 opacity-60" />
                                  )}
                                </div>
                              </Badge>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent>
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
                                    disabled={
                                      invoice.status === status ||
                                      isUpdatingThisInvoice
                                    }
                                    className="text-xs py-2"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span
                                        className={
                                          status === "PENDING"
                                            ? "text-blue-600"
                                            : "text-red-600"
                                        }
                                      >
                                        {isUpdatingThisInvoice ? (
                                          <Loader2 className="animate-spin h-3 w-3" />
                                        ) : (
                                          status
                                        )}
                                      </span>

                                      {invoice.status === status && (
                                        <BadgeCheckIcon className="h-3 w-3 text-green-600" />
                                      )}
                                    </div>
                                  </DropdownMenuItem>
                                ),
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(invoice.dueDate)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                router.push(`/finances/invoice/${invoice.id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-black hover:bg-zinc-100"
                              onClick={() =>
                                router.push(
                                  `/finances/invoice/${invoice.invoiceNumber}/edit`,
                                )
                              }
                            >
                              <PenBoxIcon className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500/70 hover:text-red-600 hover:bg-red-50 hidden"
                            >
                              <Trash2Icon className="h-4 w-4" />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
