"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus, ReceiptText, Users, X } from "lucide-react";
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
import { academyInstant, formatAcademy } from "@/lib/academy-time";
import { cn } from "@/lib/utils";
import { useProgramme } from "@/providers/ProgrammeContext";
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
  const { batches, plansFor, programmeId } = useProgramme();
  const plans = plansFor(programmeId);
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
  const [watchedLines, chosenAthletes, dueDate] = useWatch({
    control: form.control,
    name: ["lines", "athletes", "dueDate"],
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
      <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
        <div className="min-w-0 space-y-4">
          <FormAlert message={error} />
          {!editing && (
            <FormSection title="Who" icon={Users} columns={1}>
              <FormField
                control={form.control}
                name="athletes"
                render={({ fieldState }) => (
                  <FormItem>
                    <Recipients
                      batches={batches}
                      linePlanIds={(watchedLines ?? []).map((l) => l?.subscriptionPlanId).filter((id): id is string => !!id)}
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

          <FormSection title="Charges" icon={ReceiptText} columns={1}>
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

          <FormSection title="Due and notes" icon={CalendarClock}>
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

        </div>

        {/* Summary: beside the form on a desktop, under it on a phone */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="overflow-hidden rounded-xl bg-brand-navy text-white shadow-sm dark:ring-1 dark:ring-white/10">
            <div className="space-y-4 p-5">
              <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
                {editing ? `Invoice ${invoiceNumber}` : recipients > 1 ? "Each invoice" : "New invoice"}
              </p>
              <p className="tabular font-display text-4xl leading-none font-bold text-brand-gold">{formatCurrency(each)}</p>
              {!editing && (
                <p className="tabular text-sm text-white/70">
                  {recipients === 0
                    ? "Choose who to bill"
                    : recipients === 1
                      ? "1 athlete"
                      : `${recipients} athletes · ${formatCurrency(each * recipients)} in all`}
                </p>
              )}
              {(watchedLines ?? []).some((l) => l.description) && (
                <ul className="space-y-1 border-t border-white/10 pt-3 text-sm">
                  {(watchedLines ?? [])
                    .filter((l) => l.description)
                    .map((l, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="truncate text-white/80">
                          {Number(l.quantity) > 1 && `${l.quantity} × `}
                          {l.description}
                        </span>
                        <span className="tabular shrink-0">{Number(l.unitAmount) > 0 ? formatCurrency(lineTotal(l)) : "—"}</span>
                      </li>
                    ))}
                </ul>
              )}
              {dueDate && <p className="text-sm text-white/70">Due {formatAcademy(academyInstant(dueDate, "12:00"), { day: "numeric", month: "short", year: "numeric" })}</p>}
            </div>
            <div className="hidden gap-2 border-t border-white/10 bg-white/5 p-4 lg:grid">
              <Button type="submit" disabled={saving || (editing && !form.formState.isDirty)} className="h-11 w-full bg-brand-gold text-brand-navy hover:bg-brand-gold/90">
                {saving && <Loader2 className="animate-spin" />}
                {editing ? "Save changes" : recipients > 1 ? `Create ${recipients} invoices` : "Create invoice"}
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link href={editing ? `/invoices/${invoiceNumber}` : "/invoices"}>Cancel</Link>
              </Button>
            </div>
          </section>
        </aside>

        <StickyActions className="lg:hidden">
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
