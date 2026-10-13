"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, MoreHorizontal, Pencil, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/format";
import deleteFinancialTransaction from "../actions/delete-transaction";
import type { PaymentRow } from "../queries/list-payments";
import EditTransactionModal from "./EditTransactionModal";
import TransactionDetails from "./TransactionDetails";

export function PaymentRowActions({ payment }: { payment: PaymentRow }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, start] = useTransition();

  const remove = () =>
    start(async () => {
      const res = await deleteFinancialTransaction(payment.id);
      if (!res.success) return void toast.error(res.message);
      toast.success(`Receipt ${payment.receiptNumber} removed`);
      setConfirm(false);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${payment.receiptNumber}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setReceiptOpen(true)}>
            <Receipt /> Receipt
          </DropdownMenuItem>
          {payment.invoice && (
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${payment.invoice.id}`}>
                <FileText /> Open invoice
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil /> Edit payment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Remove payment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {receiptOpen && (
        <TransactionDetails id={payment.id} open={receiptOpen} onOpenChange={setReceiptOpen} />
      )}
      {editOpen && (
        <EditTransactionModal data={payment} open={editOpen} onOpenChange={setEditOpen} />
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove receipt {payment.receiptNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              {formatCurrency(payment.amountPaid)} comes off what&apos;s been paid
              {payment.invoice ? ` on ${payment.invoice.invoiceNumber}` : ""}, and the
              invoice&apos;s balance and status update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep payment</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              Remove payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
