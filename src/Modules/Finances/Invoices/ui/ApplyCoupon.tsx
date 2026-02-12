"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TagsIcon,
  Loader2,
  Ticket,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { ApplyCouponToInvoice } from "../Server/ApplyDiscounts";

type Props = {
  status: string;
  invoiceNumber: string;
  balance?: number; // optional for UI hints
};

const ApplyCoupon = ({ status, invoiceNumber, balance }: Props) => {
  const [open, setOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = status === "PAID" || status === "CANCELED";

  const normalized = useMemo(
    () => couponCode.trim().toUpperCase(),
    [couponCode],
  );
  const canSubmit = normalized.length > 0 && !disabled && !isPending;

  const onSubmit = () => {
    if (!normalized) {
      setErrorText("Enter a coupon code.");
      return;
    }

    setErrorText(null);

    startTransition(async () => {
      const res = await ApplyCouponToInvoice({
        invoiceNumber,
        couponCode: normalized,
      });

      if (res.success) {
        Sweetalert({ icon: "success", title: "Success!", text: res.message });
        setCouponCode("");
        setErrorText(null);
        setOpen(false);
      } else {
        setErrorText(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            status === "PAID" && "hidden",
          )}
          title={
            disabled ? "Cannot apply coupon to this invoice" : "Apply coupon"
          }
        >
          <TagsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Apply coupon
          </DialogTitle>
          <DialogDescription>
            This applies a discount to invoice{" "}
            <span className="font-mono font-semibold text-foreground">
              {invoiceNumber}
            </span>
            . If the discount would cause overpayment, it will just clear the
            balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Quick context */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {invoiceNumber}
            </Badge>
            <Badge
              className={cn(
                "gap-1",
                status === "PENDING" &&
                  "bg-blue-100/80 text-blue-800 border-blue-200",
                status === "PARTIAL" &&
                  "bg-amber-100/80 text-amber-800 border-amber-200",
                status === "PAID" &&
                  "bg-emerald-100/80 text-emerald-800 border-emerald-200",
                status === "CANCELED" &&
                  "bg-red-100/80 text-red-800 border-red-200",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {status}
            </Badge>

            {typeof balance === "number" ? (
              <Badge variant="secondary" className="ml-auto">
                Balance: KES {balance.toLocaleString()}
              </Badge>
            ) : null}
          </div>

          {/* Error */}
          {errorText ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>{errorText}</div>
            </div>
          ) : null}

          {/* Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Coupon code
            </label>
            <Input
              placeholder="e.g. WELCOME10"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              disabled={disabled || isPending}
              className="h-11"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Codes are treated as case-insensitive (auto uppercased).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isPending}
            >
              Close
            </Button>
          </DialogClose>

          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-xl"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyCoupon;
