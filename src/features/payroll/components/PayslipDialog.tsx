"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, Loader2, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adjustPayslip, approvePayslip, reopenPayslip } from "../actions/payroll";
import type { PayslipRow } from "../queries";

type Row = { name: string; amount: string };
const rows = (items?: { name: string; amount: number }[]) => (items ?? []).map((i) => ({ name: i.name, amount: String(i.amount) }));
const OFF = ["DEDUCTION", "TAX", "ONE_OFF", "ADVANCE"];

function Items({ label, add, items, onChange }: { label: string; add: string; items: Row[]; onChange: (r: Row[]) => void }) {
  const edit = (i: number, p: Partial<Row>) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      {items.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input aria-label={`${label} name`} placeholder="e.g. Transport" value={r.name} onChange={(e) => edit(i, { name: e.target.value })} />
          <Input aria-label={`${label} amount`} inputMode="decimal" placeholder="0" className="tabular w-32 text-right font-mono" value={r.amount} onChange={(e) => edit(i, { amount: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onChange([...items, { name: "", amount: "" }])}>
        <Plus /> {add}
      </Button>
    </fieldset>
  );
}

/** One payslip: what it's made of, and the allowances, one-off deductions and advance for this month. */
export function PayslipDialog({
  slip,
  monthLocked,
  canApprove,
  open,
  onOpenChange,
}: {
  slip: PayslipRow;
  monthLocked: boolean;
  canApprove: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const locked = monthLocked || slip.status !== "PROVISIONAL";
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allowances, setAllowances] = useState(() => rows(slip.adjustments.allowances));
  const [oneOffs, setOneOffs] = useState(() => rows(slip.adjustments.oneOffs));
  const [advance, setAdvance] = useState(slip.adjustments.advance == null ? "" : String(slip.adjustments.advance));
  const maxAdvance = Math.max(0, Math.floor((slip.gross * 2) / 3) - (slip.deductions - slip.advance));

  const clean = (r: Row[]) => r.filter((x) => x.name.trim() || x.amount.trim()).map((x) => ({ name: x.name, amount: x.amount }));
  const saveEdits = () => adjustPayslip(slip.id, { allowances: clean(allowances), oneOffs: clean(oneOffs), advance: advance.trim() === "" ? null : advance });
  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveEdits();
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      onOpenChange(false);
      router.refresh();
    });
  };

  const act = (fn: () => Promise<{ success: boolean; message: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      router.refresh();
    });
  };

  const earnings = slip.lines.filter((l) => l.kind === "BASIC" || l.kind === "ALLOWANCE");
  const taken = slip.lines.filter((l) => OFF.includes(l.kind));
  const employer = slip.lines.filter((l) => l.kind === "EMPLOYER");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{slip.staff.fullNames}</DialogTitle>
          <DialogDescription>
            {monthLocked ? "Approved. Put corrections on next month's payslip." : locked ? "Approved. Reopen it to change it." : "Add this month's extras, then save or approve."}
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y rounded-md border text-sm">
          {[...earnings, { kind: "GROSS", name: "Gross pay", amount: slip.gross }, ...taken].map((l, i) => (
            <div key={i} className={cn("flex justify-between gap-3 px-3 py-1.5", l.kind === "GROSS" && "bg-muted/40 font-semibold")}>
              <dt>{l.name}</dt>
              <dd className="tabular font-mono">{OFF.includes(l.kind) ? `−${formatCurrency(l.amount)}` : formatCurrency(l.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 bg-primary/5 px-3 py-2 font-bold">
            <dt>Net pay</dt>
            <dd className="tabular font-mono">{formatCurrency(slip.net)}</dd>
          </div>
          {employer.map((l, i) => (
            <div key={i} className="flex justify-between gap-3 px-3 py-1.5 text-muted-foreground">
              <dt>{l.name}</dt>
              <dd className="tabular font-mono">{formatCurrency(l.amount)}</dd>
            </div>
          ))}
        </dl>

        {slip.overCap && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="grid gap-2">
              <p>Deductions are over two-thirds of gross pay.</p>
              {!locked && slip.advance > 0 && (
                <Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={() => setAdvance(String(Math.min(slip.advance, maxAdvance)))}>
                  Take {formatCurrency(Math.min(slip.advance, maxAdvance))} of the advance, the rest next month
                </Button>
              )}
            </div>
          </div>
        )}

        {!locked && (
          <div className="grid gap-5">
            <Items label="Allowances and bonuses" add="Add allowance" items={allowances} onChange={setAllowances} />
            <Items label="One-off deductions" add="Add deduction" items={oneOffs} onChange={setOneOffs} />
            {(slip.advance > 0 || slip.adjustments.advance != null) && (
              <div className="grid gap-1.5">
                <Label htmlFor="slip-advance">Advance to take back this month (KES)</Label>
                <Input id="slip-advance" inputMode="decimal" className="tabular w-40 font-mono" placeholder={String(slip.advance)} value={advance} onChange={(e) => setAdvance(e.target.value)} />
                <p className="text-xs text-muted-foreground">Leave empty to take what&apos;s due.</p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {locked && error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          {canApprove && !monthLocked && locked && (
            <Button variant="outline" disabled={saving} onClick={() => act(() => reopenPayslip(slip.id))}>
              <LockOpen /> Reopen
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={`/api/payslips/${slip.id}`} target="_blank" rel="noopener">
              Payslip PDF
            </a>
          </Button>
          {!locked && (
            <Button variant={canApprove ? "outline" : "default"} onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save
            </Button>
          )}
          {!locked && canApprove && (
            <Button
              disabled={saving}
              onClick={() =>
                act(async () => {
                  // Whatever is typed here is saved first
                  const saved = await saveEdits();
                  return saved.success ? approvePayslip(slip.id) : saved;
                })
              }
            >
              <BadgeCheck /> Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
