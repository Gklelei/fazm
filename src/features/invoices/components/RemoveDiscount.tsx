"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { removeInvoiceDiscount } from "@/features/coupons/actions/redeem";

/** Takes one discount off an invoice. */
export function RemoveDiscount({ invoiceNumber, discountId, label }: { invoiceNumber: string; discountId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Remove ${label}`}
      title={`Remove ${label}`}
      disabled={pending}
      className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50 print:hidden"
      onClick={() =>
        start(async () => {
          const res = await removeInvoiceDiscount(invoiceNumber, discountId);
          if (!res.success) return void toast.error(res.message);
          toast.success(res.message);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
    </button>
  );
}
