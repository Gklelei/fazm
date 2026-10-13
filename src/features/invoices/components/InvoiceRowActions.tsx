"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Banknote, Eye, MoreHorizontal, Pencil, RotateCcw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setInvoiceCancelled } from "../actions/cancel-invoice";
import type { InvoiceListRow } from "../queries/list";
import ApplyCoupon from "./ApplyCoupon";
import { RecordPaymentDialog } from "@/features/finance/components/RecordPaymentDialog";
import { athleteName } from "@/features/athletes/lib/names";

export function InvoiceRowActions({ invoice }: { invoice: InvoiceListRow }) {
  const queryClient = useQueryClient();
  const [couponOpen, setCouponOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pending, start] = useTransition();
  const balance = Math.max(invoice.amountDue - invoice.amountPaid, 0);
  const cancelled = invoice.status === "CANCELED";
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["invoices"] });

  const toggleCancelled = () =>
    start(async () => {
      const res = await setInvoiceCancelled(invoice.invoiceNumber, !cancelled);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      await refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pending}
            aria-label={`Actions for ${invoice.invoiceNumber}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${invoice.id}`}>
              <Eye /> View invoice
            </Link>
          </DropdownMenuItem>
          {!cancelled && (
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.invoiceNumber}/edit`}>
                <Pencil /> Edit
              </Link>
            </DropdownMenuItem>
          )}
          {!cancelled && balance > 0 && (
            <DropdownMenuItem onSelect={() => setPayOpen(true)}>
              <Banknote /> Record payment
            </DropdownMenuItem>
          )}
          {!cancelled && balance > 0 && (
            <DropdownMenuItem onSelect={() => setCouponOpen(true)}>
              <Tag /> Apply coupon
            </DropdownMenuItem>
          )}
          {invoice.status !== "PAID" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant={cancelled ? "default" : "destructive"}
                onSelect={toggleCancelled}
              >
                {cancelled ? <RotateCcw /> : <Ban />}
                {cancelled ? "Restore invoice" : "Cancel invoice"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ApplyCoupon
        invoiceNumber={invoice.invoiceNumber}
        balance={balance}
        open={couponOpen}
        onOpenChange={setCouponOpen}
        onApplied={refresh}
      />
      {payOpen && (
        <RecordPaymentDialog
          trigger={null}
          open={payOpen}
          onOpenChange={setPayOpen}
          athlete={{ athleteId: invoice.athlete.athleteId, name: athleteName(invoice.athlete) }}
          invoiceNumber={invoice.invoiceNumber}
        />
      )}
    </>
  );
}
