"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { formatAcademy } from "@/lib/academy-time";
import { billingMonth } from "@/lib/billing";
import { planChangeSchema, type OldBillChoice, type PlanChoice } from "../../schemas/plan-change";

export type PlanChangeValue = { choice: PlanChoice; planId: string; oldBill: OldBillChoice; oldInvoice: string };
export const blankPlanChange = (choice: PlanChoice = "NEXT_BILL"): PlanChangeValue => ({ choice, planId: "", oldBill: "KEEP", oldInvoice: "" });

/** A fees bill on their account, newest first */
export type FeeBill = { invoiceNumber: string; description: string | null; payable: number; paid: number; createdAt: string };

/** The athlete's fees bills the old-bill choices can work on (not cancelled), newest first. */
export function feeBillsOf(
  invoices: { invoiceNumber: string; type: string; status: string; description: string | null; amountDue: unknown; discount: unknown; amountPaid: unknown; createdAt: Date | string }[],
): FeeBill[] {
  return invoices
    .filter((i) => i.type === "SUBSCRIPTION" && i.status !== "CANCELED")
    .map((i) => ({
      invoiceNumber: i.invoiceNumber,
      description: i.description,
      payable: Math.max(Number(i.amountDue) - Number(i.discount ?? 0), 0),
      paid: Number(i.amountPaid),
      createdAt: new Date(i.createdAt).toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
}

/** The first problem with the choices, in words, or null. */
export function planChangeProblem(v: PlanChangeValue) {
  const r = planChangeSchema.safeParse({ ...v, planId: v.planId || undefined, oldInvoice: v.oldInvoice || undefined });
  return r.success ? null : (r.error.issues[0]?.message ?? "Check the fee plan choices.");
}

const DAY = { day: "numeric", month: "short" } as const;

function Option({ on, onClick, title, hint }: { on: boolean; onClick: () => void; title: string; hint?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("rounded-md border px-3 py-2 text-left transition-colors", on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted")}
    >
      <span className="block text-sm font-medium">{title}</span>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

/**
 * What happens to an athlete's fee plan, for Transfer and Change plan: the new plan from the next
 * bill or from today (billed now), keep it, or stop billing. From today, staff say what happens to
 * the bill already raised on the old plan.
 */
export function PlanChangeFields({
  value,
  onChange,
  plans,
  choices,
  currentPlan,
  bills,
  idPrefix,
}: {
  value: PlanChangeValue;
  onChange: (v: PlanChangeValue) => void;
  plans: { id: string; name: string; amount: string | number }[];
  choices: PlanChoice[];
  /** Their plan now, for "Keep" */
  currentPlan?: string;
  bills: FeeBill[];
  idPrefix: string;
}) {
  const set = (patch: Partial<PlanChangeValue>) => onChange({ ...value, ...patch });
  const month = billingMonth(new Date());
  const chosenBill = bills.find((b) => b.invoiceNumber === value.oldInvoice);
  // Whole shillings, as the server credits it
  const credit = chosenBill ? Math.round(chosenBill.payable * month.unused) : 0;
  const DAY_MS = 86_400_000;
  const daysAll = Math.round((month.end.getTime() - month.start.getTime()) / DAY_MS);
  const daysLeft = Math.round(month.unused * daysAll);
  const needsPlan = value.choice === "NEXT_BILL" || value.choice === "RESTART";

  const label: Record<PlanChoice, { title: string; hint: string }> = {
    NEXT_BILL: { title: "New plan from the next bill", hint: `From ${formatAcademy(month.end, DAY)}. Nothing billed now.` },
    RESTART: { title: "New plan from today", hint: "Bills the new plan now." },
    KEEP: { title: `Keep ${currentPlan ?? "their plan"}`, hint: "Nothing changes." },
    STOP: { title: "Stop billing", hint: "No plan from today." },
  };

  return (
    <div className="space-y-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Fee plan</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.map((c) => (
            <Option key={c} on={value.choice === c} onClick={() => set({ choice: c })} {...label[c]} />
          ))}
        </div>
      </fieldset>

      {needsPlan && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-plan`}>New plan</Label>
          <Select value={value.planId} onValueChange={(planId) => set({ planId })}>
            <SelectTrigger id={`${idPrefix}-plan`} className="w-full">
              <SelectValue placeholder="Choose a plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {formatCurrency(Number(p.amount))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value.choice === "RESTART" && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Their bill on the current plan</legend>
          <div className="grid grid-cols-3 gap-2">
            <Option on={value.oldBill === "KEEP"} onClick={() => set({ oldBill: "KEEP" })} title="Keep it" />
            <Option on={value.oldBill === "CANCEL"} onClick={() => set({ oldBill: "CANCEL", oldInvoice: "" })} title="Cancel it" />
            <Option on={value.oldBill === "CREDIT"} onClick={() => set({ oldBill: "CREDIT" })} title="Credit unused days" />
          </div>
          {value.oldBill !== "KEEP" &&
            (bills.length ? (
              <Select value={value.oldInvoice} onValueChange={(oldInvoice) => set({ oldInvoice })}>
                <SelectTrigger id={`${idPrefix}-bill`} className="w-full" aria-label="Bill">
                  <SelectValue placeholder="Choose the bill" />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((b) => (
                    <SelectItem key={b.invoiceNumber} value={b.invoiceNumber} disabled={value.oldBill === "CANCEL" && b.paid > 0}>
                      {b.invoiceNumber} · {formatCurrency(b.payable)}
                      {b.paid > 0 ? ` · ${formatCurrency(b.paid)} paid` : " · unpaid"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">No fees bills on their account.</p>
            ))}
          {value.oldBill === "CREDIT" && chosenBill && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(credit)} off the new bill: {daysLeft} of {daysAll} days left
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
