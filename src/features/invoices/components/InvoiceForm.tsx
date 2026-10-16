"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { Recipients } from "./Recipients";
import { createInvoices, updateInvoice } from "../actions/save-invoice";
import {
  createInvoiceSchema,
  editInvoiceSchema,
  INVOICE_TYPES,
  invoiceTotal,
  lineTotal,
  type CreateInvoiceInput,
} from "../schemas";

type Values = CreateInvoiceInput;

/** Create invoices (for chosen athletes and/or whole batches) or edit one invoice. */
export function InvoiceForm({
  invoiceNumber,
  values,
  defaultDue,
}: {
  /** Set when editing */
  invoiceNumber?: string;
  values?: Omit<Values, "athletes" | "batches">;
  defaultDue: string;
}) {
  const router = useRouter();
  const utils = UseUtilsContext().data;
  const batches = utils?.batches ?? [];
  const plans = utils?.plans ?? [];
  const editing = !!invoiceNumber;
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(
      editing ? editInvoiceSchema : createInvoiceSchema,
    ) as never,
    defaultValues: {
      athletes: [],
      type: "MANUAL",
      lines: [
        { description: "", quantity: 1, unitAmount: "" as unknown as number },
      ],
      dueDate: defaultDue,
      notes: "",
      ...values,
    },
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty && !saved);
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const [watchedLines, chosenAthletes] = useWatch({
    control: form.control,
    name: ["lines", "athletes"],
  });

  const each = invoiceTotal(
    (watchedLines ?? []).filter(
      (l) => Number(l.unitAmount) > 0 && Number(l.quantity) > 0,
    ),
  );
  const recipients = chosenAthletes?.length ?? 0;

  const addPlan = (p: (typeof plans)[number]) => {
    const empty =
      lines.fields.length === 1 &&
      !form.getValues("lines.0.description") &&
      !form.getValues("lines.0.unitAmount");
    const line = {
      description: p.name,
      quantity: 1,
      unitAmount: Number(p.amount),
      subscriptionPlanId: p.id,
    };
    if (empty) {
      form.setValue("lines.0", line, { shouldDirty: true });
      form.clearErrors("lines.0");
    } else lines.append(line);
    if (form.getValues("type") === "MANUAL")
      form.setValue("type", "SUBSCRIPTION", { shouldDirty: true });
  };

  const submit = form.handleSubmit(() =>
    start(async () => {
      setError(null);
      const v = form.getValues();
      const res = editing
        ? await updateInvoice(invoiceNumber, v)
        : await createInvoices(v);
      if (!res.success) return setError(res.message);
      setSaved(true);
      toast.success(res.message);
      const one = "invoiceNumber" in res ? res.invoiceNumber : null;
      router.push(one ? `/invoices/${one}` : "/invoices");
      router.refresh();
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <FormAlert message={error} />
        <div className="space-y-8 rounded-lg border bg-card p-4 sm:p-6">
          {!editing && (
            <FormSection title="Who" columns={1}>
              <FormField
                control={form.control}
                name="athletes"
                render={({ fieldState }) => (
                  <FormItem>
                    <Recipients
                      batches={batches}
                      invalid={!!fieldState.error}
                      onChange={(ids) => {
                        form.setValue("athletes", ids, { shouldDirty: true });
                        if (ids.length) form.clearErrors("athletes");
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
          )}

          <FormSection title="Charges" columns={1}>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <ChoiceChips
                    label="Type"
                    options={INVOICE_TYPES}
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                  />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              {lines.fields.map((f, i) => {
                const l = watchedLines?.[i];
                const amount =
                  l && Number(l.unitAmount) > 0 && Number(l.quantity) > 0
                    ? lineTotal(l)
                    : 0;
                return (
                  <div
                    key={f.id}
                    className="grid grid-cols-[1fr_5rem_8rem_auto] items-start gap-2 rounded-md border p-3 max-sm:grid-cols-[4.5rem_1fr_auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`lines.${i}.description`}
                      render={({ field }) => (
                        <FormItem className="max-sm:col-span-3">
                          <FormLabel className={cn(i > 0 && "sm:sr-only")}>
                            Description
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="h-11"
                              placeholder="e.g. Training kit"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lines.${i}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(i > 0 && "sm:sr-only")}>
                            Qty
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={
                                (field.value as number | string | undefined) ??
                                ""
                              }
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={99}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lines.${i}.unitAmount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(i > 0 && "sm:sr-only")}>
                            Price (KES)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={
                                (field.value as number | string | undefined) ??
                                ""
                              }
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div
                      className={cn(
                        "flex h-11 items-center gap-1 self-end",
                        i === 0 && "sm:mt-[22px]",
                      )}
                    >
                      <span className="tabular w-24 text-right text-sm font-medium max-sm:hidden">
                        {amount ? formatCurrency(amount) : "—"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        aria-label={`Remove line ${i + 1}`}
                        disabled={lines.fields.length === 1}
                        onClick={() => lines.remove(i)}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <FormField
                control={form.control}
                name="lines"
                render={() => <FormMessage />}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    lines.append({
                      description: "",
                      quantity: 1,
                      unitAmount: "" as unknown as number,
                    })
                  }
                  disabled={lines.fields.length >= 20}
                >
                  <Plus /> Add a line
                </Button>
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addPlan(p)}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed px-3 text-sm hover:border-primary hover:bg-muted"
                  >
                    <Plus className="size-3.5" /> {p.name} ·{" "}
                    {formatCurrency(Number(p.amount))}
                  </button>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection title="Due and notes">
            <TextField<Values> name="dueDate" label="Due date" type="date" />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="@md:col-span-2">
                  <FormLabel>
                    Notes{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-lg bg-muted/50 p-4">
            <span className="text-sm text-muted-foreground">
              {editing
                ? "Total"
                : recipients > 1
                  ? `Each invoice · ${recipients} invoices`
                  : "Total"}
            </span>
            <span className="tabular font-display text-2xl font-bold">
              {formatCurrency(each)}
              {!editing && recipients > 1 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({formatCurrency(each * recipients)} in all)
                </span>
              )}
            </span>
          </div>
        </div>

        <StickyActions>
          <Button variant="ghost" asChild>
            <Link href={editing ? `/invoices/${invoiceNumber}` : "/invoices"}>
              Cancel
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={saving || (editing && !form.formState.isDirty)}
            className="min-w-40"
          >
            {saving && <Loader2 className="animate-spin" />}
            {editing
              ? "Save changes"
              : recipients > 1
                ? `Create ${recipients} invoices`
                : "Create invoice"}
          </Button>
        </StickyActions>
      </form>
    </Form>
  );
}
