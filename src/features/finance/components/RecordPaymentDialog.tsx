"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/providers/SessionProvider";
import { AthletePicker, type PickedAthlete } from "@/features/athletes/components/AthletePicker";
import type { InvoicesPage } from "@/features/invoices/queries/list";
import createFinancialTransaction from "../actions/create-transaction";
import { FinanceSchema, PAYMENT_TYPE } from "../schemas";
import { METHOD_LABEL } from "../lib/methods";


type Errors = Partial<Record<string, string>>;

/**
 * Records a payment against an open invoice. Opened empty from Payments, or
 * pre-filled from an invoice row / athlete profile.
 */
export function RecordPaymentDialog({
  athlete: presetAthlete = null,
  invoiceNumber: presetInvoice,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  athlete?: PickedAthlete | null;
  invoiceNumber?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [saving, start] = useTransition();
  const [errors, setErrors] = useState<Errors>({});

  const blank = () => ({
    athlete: presetAthlete,
    invoiceNumber: presetInvoice ?? "",
    /** null = not typed yet, so it follows the invoice balance */
    amountPaid: null as string | null,
    paymentType: "MPESA_PAYBILL" as (typeof PAYMENT_TYPE)[number],
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    collectedBy: user.name,
    notes: "",
  });
  const [form, setForm] = useState(blank);
  const set = (patch: Partial<ReturnType<typeof blank>>) => setForm((f) => ({ ...f, ...patch }));

  const athleteId = form.athlete?.athleteId;
  const { data: invoices, isFetching: loadingInvoices } = useQuery({
    queryKey: ["open-invoices", athleteId],
    enabled: open && !!athleteId,
    queryFn: async (): Promise<InvoicesPage> => {
      const res = await fetch(`/api/invoices?athleteId=${athleteId}&open=1&pageSize=50`);
      if (!res.ok) throw new Error("Couldn't load invoices");
      return res.json();
    },
  });
  const openInvoices = invoices?.items ?? [];
  // The chosen invoice, or the athlete's only open one
  const invoiceNumber =
    form.invoiceNumber || (openInvoices.length === 1 ? openInvoices[0].invoiceNumber : "");
  const invoice = openInvoices.find((i) => i.invoiceNumber === invoiceNumber);
  const balance = invoice ? Math.max(invoice.amountDue - invoice.amountPaid, 0) : 0;
  const amount = form.amountPaid ?? (invoice ? String(balance) : "");


  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      athleteId: athleteId ?? "",
      invoiceId: invoiceNumber,
      amountPaid: amount.trim(),
      paymentType: form.paymentType,
      paymentDate: form.paymentDate,
      collectedBy: form.collectedBy,
      notes: form.notes,
    };
    const parsed = FinanceSchema.safeParse(values);
    const next: Errors = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
    if (parsed.success && Number(values.amountPaid) > balance) {
      next.amountPaid = `The balance on this invoice is ${formatCurrency(balance)}.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    start(async () => {
      const res = await createFinancialTransaction(values);
      if (!res.success) return void toast.error(res.message);
      toast.success(`Payment recorded · receipt ${res.receiptNumber}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["open-invoices"] }),
      ]);
      setForm(blank());
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setErrors({});
      }}
    >
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Banknote /> Record payment
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Paid against one invoice. A receipt number is issued when you save.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="pay-athlete">Athlete</Label>
            <AthletePicker
              id="pay-athlete"
              value={form.athlete}
              invalid={!!errors.athleteId}
              onChange={(a) => set({ athlete: a, invoiceNumber: "", amountPaid: null })}
            />
            {errors.athleteId && <p className="text-sm text-destructive">Choose who paid.</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pay-invoice">Invoice</Label>
            <Select
              value={invoiceNumber}
              onValueChange={(v) => set({ invoiceNumber: v, amountPaid: null })}
              disabled={!athleteId || loadingInvoices}
            >
              <SelectTrigger id="pay-invoice" className="w-full" aria-invalid={!!errors.invoiceId}>
                <SelectValue
                  placeholder={
                    !athleteId
                      ? "Choose an athlete first"
                      : loadingInvoices
                        ? "Loading invoices…"
                        : openInvoices.length
                          ? "Choose invoice"
                          : "No unpaid invoices"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {openInvoices.map((i) => (
                  <SelectItem key={i.id} value={i.invoiceNumber}>
                    <span className="font-mono">{i.invoiceNumber}</span>
                    <span className="text-muted-foreground">
                      · {formatCurrency(Math.max(i.amountDue - i.amountPaid, 0))} due
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.invoiceId && <p className="text-sm text-destructive">Choose the invoice being paid.</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Amount (KES)</Label>
              <Input
                id="pay-amount"
                inputMode="decimal"
                className="tabular font-mono"
                value={amount}
                onChange={(e) => set({ amountPaid: e.target.value })}
                aria-invalid={!!errors.amountPaid}
              />
              {errors.amountPaid ? (
                <p className="text-sm text-destructive">{errors.amountPaid}</p>
              ) : (
                invoice && <p className="text-xs text-muted-foreground">Balance {formatCurrency(balance)}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-date">Paid on</Label>
              <Input
                id="pay-date"
                type="date"
                max={format(new Date(), "yyyy-MM-dd")}
                value={form.paymentDate}
                onChange={(e) => set({ paymentDate: e.target.value })}
              />
            </div>
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Method</legend>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPE.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring",
                    form.paymentType === m && "border-primary bg-primary/5 font-medium",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value={m}
                    checked={form.paymentType === m}
                    onChange={() => set({ paymentType: m })}
                    className="accent-primary"
                  />
                  {METHOD_LABEL[m]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-by">Received by</Label>
              <Input id="pay-by" value={form.collectedBy} onChange={(e) => set({ collectedBy: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-notes">Reference / notes</Label>
              <Textarea
                id="pay-notes"
                rows={1}
                placeholder="e.g. M-Pesa code"
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
