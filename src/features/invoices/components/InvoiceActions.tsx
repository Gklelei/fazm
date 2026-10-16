"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Banknote, FileDown, MoreHorizontal, Pencil, RotateCcw, Tag } from "lucide-react";
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
import ApplyCoupon from "./ApplyCoupon";

/** The invoice page's buttons: pay first, then edit and PDF, the rest in a menu. */
export function InvoiceActions({
  id,
  invoiceNumber,
  status,
  balance,
  athlete,
}: {
  id: string;
  invoiceNumber: string;
  status: string;
  balance: number;
  athlete: PickedAthlete;
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

  return (
    <>
      <Button variant="outline" asChild>
        <a href={`/api/finance/invoice/${id}/pdf`} target="_blank" rel="noopener noreferrer">
          <FileDown /> PDF
        </a>
      </Button>
      {!cancelled && (
        <Button variant="outline" asChild>
          <Link href={`/invoices/${invoiceNumber}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      )}
      {open && (
        <Button onClick={() => setPayOpen(true)}>
          <Banknote /> Record payment
        </Button>
      )}
      {(open || status !== "PAID") && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={pending} aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {open && (
              <DropdownMenuItem onSelect={() => setCouponOpen(true)}>
                <Tag /> Apply coupon
              </DropdownMenuItem>
            )}
            {open && status !== "PAID" && <DropdownMenuSeparator />}
            {status !== "PAID" && (
              <DropdownMenuItem variant={cancelled ? "default" : "destructive"} onSelect={toggleCancelled}>
                {cancelled ? <RotateCcw /> : <Ban />}
                {cancelled ? "Restore invoice" : "Cancel invoice"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ApplyCoupon
        invoiceNumber={invoiceNumber}
        balance={balance}
        open={couponOpen}
        onOpenChange={setCouponOpen}
        onApplied={() => router.refresh()}
      />
      {payOpen && (
        <RecordPaymentDialog trigger={null} open={payOpen} onOpenChange={setPayOpen} athlete={athlete} invoiceNumber={invoiceNumber} />
      )}
    </>
  );
}
