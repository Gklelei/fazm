"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { ApplyCouponToInvoice } from "../actions/apply-discounts";

/** Controlled dialog: open it from a row menu or a button. */
export default function ApplyCoupon({
  invoiceNumber,
  balance,
  open,
  onOpenChange,
  onApplied,
}: {
  invoiceNumber: string;
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const normalized = code.trim().toUpperCase();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalized) return setError("Enter a coupon code.");
    setError(null);
    start(async () => {
      const res = await ApplyCouponToInvoice({ invoiceNumber, couponCode: normalized });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      setCode("");
      onOpenChange(false);
      onApplied?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Apply a coupon</DialogTitle>
            <DialogDescription>
              Discounts invoice <span className="font-mono text-foreground">{invoiceNumber}</span>,
              balance {formatCurrency(balance)}. A discount larger than the balance just clears it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="coupon-code">Coupon code</Label>
            <Input
              id="coupon-code"
              autoFocus
              autoComplete="off"
              className="font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "coupon-error" : undefined}
            />
            {error && (
              <p id="coupon-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !normalized}>
              {pending && <Loader2 className="animate-spin" />}
              Apply coupon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
