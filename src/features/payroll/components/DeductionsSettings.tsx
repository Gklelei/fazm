"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteDeduction, saveDeduction } from "../actions/payroll";
import type { DeductionRow } from "../queries";
import { DEDUCTION_KINDS } from "../schemas";

type Staff = { id: string; fullNames: string };
const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** "6% of gross, at most KES 6,480 · before tax · academy matches" */
export function ruleSummary(d: DeductionRow) {
  const main =
    d.kind === "BANDED"
      ? `${d.bands.length} tax bands${d.relief ? `, less ${formatCurrency(d.relief)} relief` : ""}`
      : d.kind === "FIXED"
        ? formatCurrency(d.value)
        : `${d.value}% of ${d.kind === "PERCENT_BASIC" ? "basic" : "gross"}`;
  return [
    main + (d.minimum != null ? `, at least ${formatCurrency(d.minimum)}` : "") + (d.maximum != null ? `, at most ${formatCurrency(d.maximum)}` : ""),
    d.kind !== "BANDED" && d.beforeTax && "before tax",
    d.employerPercent > 0 && (d.employerPercent === 100 ? "academy matches" : `academy adds ${d.employerPercent}%`),
    d.staffIds.length > 0 && `${d.staffIds.length} staff`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function DeductionDialog({ row, staff, onClose }: { row: DeductionRow | null; staff: Staff[]; onClose: () => void }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState(() => ({
    name: row?.name ?? "",
    kind: row?.kind ?? "PERCENT_GROSS",
    value: row && row.kind !== "BANDED" ? String(row.value) : "",
    bands: (row?.bands.length ? row.bands : [{ upTo: null, rate: 0 }]).map((b) => ({ upTo: b.upTo == null ? "" : String(b.upTo), rate: String(b.rate) })),
    relief: row?.relief ? String(row.relief) : "",
    minimum: row?.minimum == null ? "" : String(row.minimum),
    maximum: row?.maximum == null ? "" : String(row.maximum),
    beforeTax: row?.beforeTax ?? false,
    employerPercent: row?.employerPercent ? String(row.employerPercent) : "",
    everyone: !row?.staffIds.length,
    staffIds: row?.staffIds ?? [],
    enabled: row ? row.enabled || !row.setUp : true,
  }));
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const banded = f.kind === "BANDED";

  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveDeduction({
        id: row?.id,
        name: f.name,
        kind: f.kind,
        value: banded ? 0 : f.value,
        bands: banded ? f.bands.map((b, i) => ({ upTo: i === f.bands.length - 1 && b.upTo.trim() === "" ? null : b.upTo, rate: b.rate })) : [],
        relief: banded ? f.relief || 0 : 0,
        minimum: num(f.minimum),
        maximum: num(f.maximum),
        beforeTax: !banded && f.beforeTax,
        employerPercent: f.employerPercent || 0,
        enabled: f.enabled,
        staffIds: f.everyone ? [] : f.staffIds,
      });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? row.name : "New deduction"}</DialogTitle>
          <DialogDescription>{row?.statutory ? "Check the rates against KRA, NSSF and SHA before turning it on." : "Taken from every payslip it applies to."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ded-name">Name</Label>
            <Input id="ded-name" value={f.name} onChange={(e) => set({ name: e.target.value })} disabled={!!row?.statutory} />
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Worked out as</legend>
            <div className="grid grid-cols-2 gap-2">
              {DEDUCTION_KINDS.map((k) => (
                <label key={k.value} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring", f.kind === k.value && "border-primary bg-primary/5 font-medium")}>
                  <input type="radio" name="ded-kind" className="accent-primary" checked={f.kind === k.value} onChange={() => set({ kind: k.value })} />
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>

          {banded ? (
            <div className="grid gap-2">
              <Label>Monthly bands (KES)</Label>
              {f.bands.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-12 shrink-0 text-muted-foreground">{i === 0 ? "Up to" : "Then to"}</span>
                  <Input
                    aria-label={`Band ${i + 1} up to`}
                    inputMode="decimal"
                    className="tabular font-mono"
                    placeholder={i === f.bands.length - 1 ? "and above" : ""}
                    value={b.upTo}
                    onChange={(e) => set({ bands: f.bands.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)) })}
                  />
                  <Input aria-label={`Band ${i + 1} rate`} inputMode="decimal" className="tabular w-20 font-mono" value={b.rate} onChange={(e) => set({ bands: f.bands.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) })} />
                  <span>%</span>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove band" disabled={f.bands.length === 1} onClick={() => set({ bands: f.bands.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set({ bands: [...f.bands, { upTo: "", rate: "" }] })}>
                <Plus /> Add band
              </Button>
              <div className="grid gap-1.5 pt-2">
                <Label htmlFor="ded-relief">Relief each month (KES)</Label>
                <Input id="ded-relief" inputMode="decimal" className="tabular w-40 font-mono" value={f.relief} onChange={(e) => set({ relief: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ded-value">{f.kind === "FIXED" ? "Amount (KES)" : "Rate (%)"}</Label>
                <Input id="ded-value" inputMode="decimal" className="tabular font-mono" value={f.value} onChange={(e) => set({ value: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ded-min">At least (KES)</Label>
                <Input id="ded-min" inputMode="decimal" className="tabular font-mono" value={f.minimum} onChange={(e) => set({ minimum: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ded-max">At most (KES)</Label>
                <Input id="ded-max" inputMode="decimal" className="tabular font-mono" value={f.maximum} onChange={(e) => set({ maximum: e.target.value })} />
              </div>
            </div>
          )}

          {!banded && (
            <label className="flex items-center justify-between gap-3 text-sm">
              Take it off before tax
              <Switch checked={f.beforeTax} onCheckedChange={(v) => set({ beforeTax: v })} />
            </label>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ded-employer">Academy adds on top (% of the employee&apos;s share)</Label>
            <Input id="ded-employer" inputMode="decimal" placeholder="0" className="tabular w-32 font-mono" value={f.employerPercent} onChange={(e) => set({ employerPercent: e.target.value })} />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Applies to</legend>
            <div className="flex gap-2">
              {[true, false].map((all) => (
                <label key={String(all)} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring", f.everyone === all && "border-primary bg-primary/5 font-medium")}>
                  <input type="radio" name="ded-who" className="sr-only" checked={f.everyone === all} onChange={() => set({ everyone: all })} />
                  {all ? "Everyone on payroll" : "Chosen staff"}
                </label>
              ))}
            </div>
            {!f.everyone && (
              <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {staff.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                      <Checkbox checked={f.staffIds.includes(s.id)} onCheckedChange={(v) => set({ staffIds: v ? [...f.staffIds, s.id] : f.staffIds.filter((x) => x !== s.id) })} />
                      {s.fullNames}
                    </label>
                  </li>
                ))}
                {!staff.length && <li className="px-3 py-2 text-sm text-muted-foreground">No one is on payroll yet.</li>}
              </ul>
            )}
          </fieldset>

          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            On
            <Switch checked={f.enabled} onCheckedChange={(v) => set({ enabled: v })} />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Settings → Payroll deductions: the statutory ones and the academy's own. */
export function DeductionsSettings({ rows, staff }: { rows: DeductionRow[]; staff: Staff[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DeductionRow | "new" | null>(null);
  const [pending, start] = useTransition();
  const remove = (d: DeductionRow) =>
    start(async () => {
      const res = await deleteDeduction(d.id);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-semibold">Payroll deductions</h2>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add deduction
        </Button>
      </div>
      <ul className="divide-y">
        {rows.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3">
            <div className="grid min-w-0 flex-1 gap-0.5 leading-tight">
              <span className="font-medium">{d.name}</span>
              <span className="text-sm text-muted-foreground">{ruleSummary(d)}</span>
            </div>
            {d.enabled ? <StatusBadge tone="success">On</StatusBadge> : d.statutory && !d.setUp ? <StatusBadge tone="warning">Not set up</StatusBadge> : <StatusBadge tone="neutral">Off</StatusBadge>}
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
              <Pencil />
            </Button>
            {!d.statutory && (
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${d.name}`} disabled={pending} onClick={() => remove(d)}>
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
        {!rows.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">No deductions yet.</li>}
      </ul>
      {editing && <DeductionDialog row={editing === "new" ? null : editing} staff={staff} onClose={() => setEditing(null)} />}
    </section>
  );
}
