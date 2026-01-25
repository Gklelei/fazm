"use client";

import Image from "next/image";
import { ArrowLeftCircle, PrinterIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { InvoiceType } from "../Types";
import { formatDate } from "@/utils/TansformWords";
import { useRouter } from "next/navigation";

interface Props {
  data: InvoiceType;
}

const ViewInvoicePage = ({ data }: Props) => {
  const router = useRouter();
  const fullName = [
    data.athlete.firstName,
    data.athlete.middleName,
    data.athlete.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const balance = data.amountDue - data.amountPaid;

  return (
    <div className="mx-auto max-w-full px-4 py-6 md:px-8">
      <div className="sticky top-0 z-20 mb-6 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 print:hidden">
        <div className="flex items-center justify-between border-b py-4">
          <div className="flex flex-1 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2 px-2 hover:bg-transparent hover:text-primary md:px-4"
            >
              <ArrowLeftCircle className="h-5 w-5" />
              <span className="hidden font-medium md:inline">
                Back to Invoices
              </span>
            </Button>
          </div>

          <div className="hidden flex-1 text-center md:block">
            <h1 className="text-lg font-bold tracking-tight text-muted-foreground">
              Invoice{" "}
              <span className="text-foreground">#{data.invoiceNumber}</span>
            </h1>
          </div>

          <div className="flex flex-1 justify-end">
            <Button asChild size="sm" className="shadow-sm">
              <a
                href={`/api/finance/invoice/${data.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                <span>Download PDF</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
      <div id="print-receipt">
        <Card className="print:border print:shadow-none">
          <CardContent className="space-y-10 p-8">
            {/* Header */}
            <section className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="space-y-4">
                <Image
                  src="/Fazam Logo Half.jpg"
                  alt="Fazam Football Academy"
                  width={80}
                  height={80}
                  className="rounded-md"
                />

                <div className="text-sm leading-relaxed text-muted-foreground">
                  <p className="text-lg font-bold text-foreground">
                    Fazam Football Academy
                  </p>
                  <p>Kimathi Street, Nairobi</p>
                  <p>academy@fazamfootball.org</p>
                  <p>0714401466</p>
                </div>
              </div>

              <div className="space-y-2 text-left md:text-right">
                <h2 className="text-4xl font-black uppercase tracking-tighter opacity-20 print:opacity-100">
                  Invoice
                </h2>

                <p className="text-sm font-medium">
                  Invoice No:{" "}
                  <span className="font-mono">{data.invoiceNumber}</span>
                </p>

                <div className="text-sm text-muted-foreground">
                  <p>Issued: {formatDate(new Date())}</p>
                  <p>
                    Due:{" "}
                    <span className="font-semibold text-foreground">
                      {formatDate(data.dueDate)}
                    </span>
                  </p>
                </div>

                <Badge
                  variant={data.status === "PAID" ? "default" : "destructive"}
                  className="uppercase"
                >
                  {data.status}
                </Badge>
              </div>
            </section>

            <Separator />

            {/* Billing Info */}
            <section className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Billed To
                </h3>

                <div className="space-y-1 text-sm">
                  <p className="text-base font-semibold">{fullName}</p>
                  <p>ID: {data.athleteId}</p>
                  {data.athlete.email && <p>{data.athlete.email}</p>}
                  {data.athlete.phoneNumber && (
                    <p>{data.athlete.phoneNumber}</p>
                  )}
                </div>
              </div>

              {data.description && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </h3>
                  <p className="text-sm leading-relaxed">{data.description}</p>
                </div>
              )}
            </section>

            {/* Line Items */}
            <section className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell className="font-medium">
                      {data.description || "General Services"}
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-right">
                      KES {data.amountDue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      KES {data.amountDue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            {/* Totals */}
            <section className="flex justify-end">
              <div className="w-full space-y-2 md:w-1/3">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span>KES {data.amountDue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Paid</span>
                  <span>KES {data.amountPaid.toLocaleString()}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Balance</span>
                  <span>KES {balance.toLocaleString()}</span>
                </div>
              </div>
            </section>

            {/* Payment Instructions */}
            <section className="rounded-lg bg-muted/30 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase">
                Payment Instructions
              </h4>
              <p className="text-sm">
                M-Pesa Send Money:
                <span className="ml-2 font-mono font-bold">0758080448</span>
              </p>
            </section>

            {/* Footer */}
            <p className="pt-8 text-center text-[10px] italic text-muted-foreground">
              This invoice is system-generated. Contact the administrator for
              discrepancies.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewInvoicePage;
