"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarRange, Gauge, Loader2, Target, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { academyToday } from "@/lib/academy-time";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { createCoupon, updateCoupon } from "../actions/coupons";
import { couponSchema, type CouponInput, type CouponValues } from "../schemas";

const TYPES = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FIXED_AMOUNT", label: "Fixed amount" },
];
const DURATIONS = [
  { value: "ONCE", label: "One invoice" },
  { value: "INVOICES", label: "A number of fees invoices" },
  { value: "ALWAYS", label: "Every fees invoice" },
];

/** Create or edit a coupon. */
export function CouponForm({ id, values, uses = 0 }: { id?: string; values?: CouponInput; uses?: number }) {
  const router = useRouter();
  const plans = UseUtilsContext().data?.plans ?? [];
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const form = useForm<CouponInput, unknown, CouponValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: values ?? {
      name: "",
      discountType: "PERCENTAGE",
      value: "" as unknown as number,
      duration: "ONCE",
      durationCount: "",
      startDate: academyToday(),
      expiryDate: "",
      usageLimit: "",
      oncePerAthlete: false,
      plans: [],
    },
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty && !saved);
  const type = useWatch({ control: form.control, name: "discountType" });
  const duration = useWatch({ control: form.control, name: "duration" });

  const submit = form.handleSubmit((v) =>
    start(async () => {
      setError(null);
      const res = id ? await updateCoupon(id, v) : await createCoupon(v);
      if (!res.success) return setError(res.message);
      setSaved(true);
      toast.success(res.message);
      router.push(`/coupons/${(res as unknown as { id: string }).id}`);
      router.refresh();
    }),
  );

  const chips = (name: "discountType" | "duration", label: string, options: { value: string; label: string }[]) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="@md:col-span-2">
          <FormLabel>{label}</FormLabel>
          <ChoiceChips label={label} options={options} value={field.value} onChange={(v) => field.onChange(v)} />
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <FormAlert message={error} />
        <div className="space-y-4">
          <FormSection title="Coupon" icon={Ticket}>
            <TextField<CouponInput>
              name="name"
              label="Code"
              autoComplete="off"
              placeholder="e.g. SIBLING10"
              className="[&_input]:font-mono [&_input]:uppercase @md:col-span-2"
            />
            {chips("discountType", "Discount", TYPES)}
            <TextField<CouponInput> name="value" label={type === "PERCENTAGE" ? "Percent off" : "Amount off (KES)"} inputMode="decimal" />
          </FormSection>

          <FormSection title="Where it's used" icon={Target}>
            {chips("duration", "Lasts", DURATIONS)}
            {duration === "INVOICES" && <TextField<CouponInput> name="durationCount" label="How many fees invoices" inputMode="numeric" />}
            <p className="text-xs text-muted-foreground @md:col-span-2">
              One invoice: put on an invoice, or given to an athlete for their next fees invoice. Longer: given to an athlete, it discounts their next fees invoices.
            </p>
            <FormField
              control={form.control}
              name="plans"
              render={({ field }) => (
                <FormItem className="@md:col-span-2">
                  <FormLabel>
                    Fee plans <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <ChoiceChips label="Fee plans" multiple options={plans.map((p) => ({ value: p.id, label: p.name }))} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Valid" icon={CalendarRange}>
            <TextField<CouponInput> name="startDate" label="From" type="date" />
            <TextField<CouponInput> name="expiryDate" label="Until" type="date" optional />
          </FormSection>

          <FormSection title="Limits" icon={Gauge}>
            <TextField<CouponInput>
              name="usageLimit"
              label="Total uses"
              optional
              inputMode="numeric"
              hint={uses ? `Used ${uses} times so far.` : undefined}
            />
            <FormField
              control={form.control}
              name="oncePerAthlete"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3 @md:self-end">
                  <FormLabel>Once per athlete</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </FormSection>
        </div>

        <StickyActions>
          <Button variant="ghost" asChild>
            <Link href={id ? `/coupons/${id}` : "/coupons"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || (!!id && !form.formState.isDirty)} className="min-w-36">
            {saving && <Loader2 className="animate-spin" />}
            {id ? "Save changes" : "Create coupon"}
          </Button>
        </StickyActions>
      </form>
    </Form>
  );
}
