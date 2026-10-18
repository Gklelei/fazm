"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Banknote,
  FileDown,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordPaymentDialog } from "@/features/finance/components/RecordPaymentDialog";
import type { PickedAthlete } from "@/features/athletes/components/AthletePicker";
import { setInvoiceCancelled } from "../actions/cancel-invoice";
import { removeCouponFromInvoice } from "@/features/coupons/actions/redeem";
import ApplyCoupon from "./ApplyCoupon";

/** The invoice page's actions, on the balance card: pay, then PDF, print, edit and a menu. */
export function InvoiceActions({
  id,
  invoiceNumber,
  status,
  balance,
  athlete,
  coupon,
}: {
  id: string;
  invoiceNumber: string;
  status: string;
  balance: number;
  athlete: PickedAthlete;
  /** The coupon on this invoice, if any */
  coupon: string | null;
}) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [pending, start] = useTransition();
  const cancelled = status === "CANCELED";
  const open = !cancelled && balance > 0;

  const toggleCancelled = () =>
    start(async () => {
      const res = await setInvoiceCancelled(invoiceNumber, !cancelled);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  // On the balance card: pay first and full width, then the document actions in a row
  return (
    <div className="grid gap-2">
      {open && (
        <Button
          onClick={() => setPayOpen(true)}
          className="h-11 w-full bg-brand-gold text-brand-navy hover:bg-brand-gold/90"
        >
          <Banknote /> Record payment
        </Button>
      )}
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="secondary" size="sm" asChild>
          <a
            href={`/api/finance/invoice/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown /> PDF
          </a>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        {!cancelled && (
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/invoices/${invoiceNumber}/edit`}>
              <Pencil /> Edit
            </Link>
          </Button>
        )}
        {(open || coupon || status !== "PAID") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="size-8 !flex-none"
                disabled={pending}
                aria-label="More actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {open && !coupon && (
                <DropdownMenuItem onSelect={() => setCouponOpen(true)}>
                  <Tag /> Apply coupon
                </DropdownMenuItem>
              )}
              {coupon && !cancelled && (
                <DropdownMenuItem
                  onSelect={() =>
                    start(async () => {
                      const res = await removeCouponFromInvoice(invoiceNumber);
                      if (!res.success) return void toast.error(res.message);
                      toast.success(res.message);
                      router.refresh();
                    })
                  }
                >
                  <X /> Remove {coupon}
                </DropdownMenuItem>
              )}
              {(open || coupon) && status !== "PAID" && (
                <DropdownMenuSeparator />
              )}
              {status !== "PAID" && (
                <DropdownMenuItem
                  variant={cancelled ? "default" : "destructive"}
                  onSelect={toggleCancelled}
                >
                  {cancelled ? <RotateCcw /> : <Ban />}
                  {cancelled ? "Restore invoice" : "Cancel invoice"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ApplyCoupon
        invoiceNumber={invoiceNumber}
        balance={balance}
        open={couponOpen}
        onOpenChange={setCouponOpen}
        onApplied={() => router.refresh()}
      />
      {payOpen && (
        <RecordPaymentDialog
          trigger={null}
          open={payOpen}
          onOpenChange={setPayOpen}
          athlete={athlete}
          invoiceNumber={invoiceNumber}
        />
      )}
    </div>
  );
}
