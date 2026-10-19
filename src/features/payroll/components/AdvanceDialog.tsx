"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { recordAdvance } from "../actions/payroll";
import { ADVANCE_METHODS } from "../schemas";

const MONTHS = [1, 2, 3, 4, 6, 12];

/** Money given ahead of pay day, taken back from the next payslips once an admin approves it. */
export function AdvanceDialog({ staff, fixedStaffId }: { staff: { id: string; fullNames: string }[]; fixedStaffId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blank = () => ({ staffId: fixedStaffId ?? "", date: format(new Date(), "yyyy-MM-dd"), amount: "", method: "MPESA" as "MPESA" | "CASH" | "BANK", reference: "", reason: "", months: "1" });
  const [f, setF] = useState(blank);
  const set = (p: Partial<ReturnType<typeof blank>>) => setF((x) => ({ ...x, ...p }));
  const each = Number(f.amount) > 0 ? Math.ceil((Number(f.amount) * 100) / Number(f.months)) / 100 : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await recordAdvance(f);
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      setF(blank());
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (setOpen(v), v || setError(null))}>
      <DialogTrigger asChild>
        <Button variant={fixedStaffId ? "outline" : "default"} size={fixedStaffId ? "sm" : "default"}>
          <HandCoins /> Record advance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Record an advance</DialogTitle>
            <DialogDescription>An admin approves it before it comes off pay.</DialogDescription>
          </DialogHeader>
          {!fixedStaffId && (
            <div className="grid gap-1.5">
              <Label>Who</Label>
              <Select value={f.staffId} onValueChange={(v) => set({ staffId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullNames}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="adv-amount">Amount (KES)</Label>
              <Input id="adv-amount" inputMode="decimal" className="tabular font-mono" value={f.amount} onChange={(e) => set({ amount: e.target.value })} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adv-date">Given on</Label>
              <Input id="adv-date" type="date" max={format(new Date(), "yyyy-MM-dd")} value={f.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Paid back over</legend>
            <div className="flex flex-wrap gap-2">
              {MONTHS.map((m) => (
                <label key={m} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring", f.months === String(m) && "border-primary bg-primary/5 font-medium")}>
                  <input type="radio" name="adv-months" className="sr-only" checked={f.months === String(m)} onChange={() => set({ months: String(m) })} />
                  {m === 1 ? "Next payslip" : `${m} months`}
                </label>
              ))}
            </div>
            {each > 0 && f.months !== "1" && <p className="text-xs text-muted-foreground">{formatCurrency(each)} a month</p>}
          </fieldset>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Given by</legend>
            <div className="grid grid-cols-3 gap-2">
              {ADVANCE_METHODS.map((m) => (
                <label key={m.value} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring", f.method === m.value && "border-primary bg-primary/5 font-medium")}>
                  <input type="radio" name="adv-method" className="accent-primary" checked={f.method === m.value} onChange={() => set({ method: m.value })} />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="adv-ref">Reference</Label>
              <Input id="adv-ref" placeholder="e.g. M-Pesa code" value={f.reference} onChange={(e) => set({ reference: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adv-reason">Reason</Label>
              <Textarea id="adv-reason" rows={1} value={f.reason} onChange={(e) => set({ reason: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Record advance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
