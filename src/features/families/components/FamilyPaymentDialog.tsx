"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Banknote, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/providers/SessionProvider";
import { PAYMENT_TYPE } from "@/features/finance/schemas";
import { METHOD_LABEL } from "@/features/finance/lib/methods";
import { allocateOldestFirst } from "../lib/allocate";
import { payFamily } from "../actions/pay";
import type { FamilyMember } from "../queries";

const day = (d: string) => formatAcademy(d, { day: "numeric", month: "short" });
const AMOUNT = /^\d+(\.\d{1,2})?$/;

/** One payment for the whole family, split across the children's open invoices. */
export function FamilyPaymentDialog({ athleteId, members }: { athleteId: string; members: FamilyMember[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Every child's open invoices, oldest due first
  const invoices = useMemo(
    () =>
      members
        .flatMap((m) => m.open.map((i) => ({ ...i, child: m.name })))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.invoiceNumber.localeCompare(b.invoiceNumber)),
    [members],
  );
  const owed = invoices.reduce((s, i) => s + i.balance, 0);

  const blank = () => ({
    total: "",
    /** Amounts typed per invoice; empty = follow the oldest-first split */
    manual: null as Record<string, string> | null,
    paymentType: "MPESA_PAYBILL" as (typeof PAYMENT_TYPE)[number],
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    collectedBy: user.name,
    notes: "",
  });
  const [form, setForm] = useState(blank);
  const set = (patch: Partial<ReturnType<typeof blank>>) => setForm((f) => ({ ...f, ...patch }));

  const auto = allocateOldestFirst(AMOUNT.test(form.total) ? Number(form.total) : 0, invoices);
  const amounts: Record<string, string> = form.manual ?? Object.fromEntries(invoices.map((i) => [i.invoiceNumber, auto.split[i.invoiceNumber] ? String(auto.split[i.invoiceNumber]) : ""]));
  const sum = invoices.reduce((s, i) => s + (AMOUNT.test(amounts[i.invoiceNumber] ?? "") ? Number(amounts[i.invoiceNumber]) : 0), 0);
  const tooMuch = invoices.find((i) => Number(amounts[i.invoiceNumber] || 0) > i.balance + 1e-9);
  const leftOver = form.manual ? 0 : auto.unallocated;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (Object.values(amounts).some((a) => a && !AMOUNT.test(a))) return setError("Enter amounts like 1500 or 1500.50.");
    if (tooMuch) return setError(`${tooMuch.invoiceNumber} only has ${formatCurrency(tooMuch.balance)} left to pay.`);
    if (leftOver > 0) return setError(`That's ${formatCurrency(leftOver)} more than the family owes. Enter ${formatCurrency(owed)} or less.`);
    const lines = invoices.filter((i) => Number(amounts[i.invoiceNumber] || 0) > 0).map((i) => ({ invoiceNumber: i.invoiceNumber, amount: Number(amounts[i.invoiceNumber]) }));
    if (!lines.length) return setError("Enter the amount the family paid.");
    if (!form.collectedBy.trim()) return setError("Enter who received it.");

    start(async () => {
      const res = await payFamily({ athleteId, paymentDate: form.paymentDate, paymentType: form.paymentType, collectedBy: form.collectedBy, notes: form.notes, lines });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
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
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={!invoices.length}>
          <Banknote /> Record family payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Record a family payment</DialogTitle>
            <DialogDescription>Each invoice gets its own receipt.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fam-total">Amount received (KES)</Label>
              <Input
                id="fam-total"
                inputMode="decimal"
                className="tabular font-mono"
                value={form.manual ? String(sum) : form.total}
                readOnly={!!form.manual}
                onChange={(e) => set({ total: e.target.value })}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Family owes {formatCurrency(owed)}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fam-date">Paid on</Label>
              <Input id="fam-date" type="date" max={format(new Date(), "yyyy-MM-dd")} value={form.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} />
            </div>
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 flex w-full items-center justify-between text-sm font-medium">
              Split
              {form.manual && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set({ manual: null, total: String(sum) })}>
                  <RotateCcw /> Split oldest first
                </Button>
              )}
            </legend>
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {invoices.map((i) => (
                <li key={i.invoiceNumber} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{i.child}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.description || "Invoice"} · due {day(i.dueDate)} · <span className="font-mono">{i.invoiceNumber}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Input
                      aria-label={`Amount for ${i.invoiceNumber}`}
                      inputMode="decimal"
                      className={cn("tabular h-9 w-28 text-right font-mono", Number(amounts[i.invoiceNumber] || 0) > i.balance && "border-destructive")}
                      value={amounts[i.invoiceNumber] ?? ""}
                      placeholder="0"
                      onChange={(e) => set({ manual: { ...amounts, [i.invoiceNumber]: e.target.value } })}
                    />
                    <p className="mt-0.5 text-[11px] text-muted-foreground">of {formatCurrency(i.balance)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>

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
                  <input type="radio" name="fam-paymentType" value={m} checked={form.paymentType === m} onChange={() => set({ paymentType: m })} className="accent-primary" />
                  {METHOD_LABEL[m]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fam-by">Received by</Label>
              <Input id="fam-by" value={form.collectedBy} onChange={(e) => set({ collectedBy: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fam-notes">Reference / notes</Label>
              <Textarea id="fam-notes" rows={1} placeholder="e.g. M-Pesa code" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Record {sum > 0 ? formatCurrency(sum) : "payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
