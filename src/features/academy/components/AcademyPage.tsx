"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Check, Loader2, MapPin, Palette, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { LocalFsUpload } from "@/components/shared/LocalFsUpload";
import { COLOR_PRESETS, isCustomColor, readableOnWhite, themeAttributes } from "@/lib/brand-color";
import { cn } from "@/lib/utils";
import { saveAcademy } from "../actions/academy";
import { AcademySchema, type AcademyInput } from "../schemas";
import type { getAcademyQueryType } from "../queries";

/** Swatches for the presets in globals.css */
const SWATCH: Record<string, string> = {
  fazam: "linear-gradient(135deg, var(--brand-navy) 50%, var(--brand-gold) 50%)",
  zinc: "oklch(0.21 0.006 285.885)",
  blue: "oklch(0.488 0.243 264.376)",
  green: "oklch(0.528 0.161 149.327)",
  orange: "oklch(0.646 0.222 41.116)",
  rose: "oklch(0.511 0.262 27.681)",
};

/** The academy profile: name, contacts, how parents pay, receipt footer, logo and colour. */
export default function AcademyPage({ academy }: { academy: getAcademyQueryType | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const form = useForm<AcademyInput>({
    resolver: zodResolver(AcademySchema),
    defaultValues: {
      academyName: academy?.academyName ?? "",
      tagline: academy?.tagline ?? "",
      description: academy?.description ?? "",
      address: academy?.address ?? "",
      phone: academy?.contactPhone ?? "",
      email: academy?.contactEmail ?? "",
      paymentType: academy?.paymentMethodType ?? "",
      paymentMethod: academy?.paymentMathod ?? "",
      footerNotes: academy?.receiptFooterNotes ?? "",
      logoUrl: academy?.logoUrl ?? "",
      primaryColor: academy?.primaryColor || "fazam",
    },
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty);
  const color = useWatch({ control: form.control, name: "primaryColor" });

  const submit = form.handleSubmit((v) =>
    start(async () => {
      setError(null);
      const res = await saveAcademy(v);
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      form.reset(v);
      queryClient.invalidateQueries({ queryKey: ["utils"] });
      router.refresh();
    }),
  );

  const area = (name: "description" | "footerNotes", label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="@md:col-span-2">
          <FormLabel>
            {label} <span className="font-normal text-muted-foreground">(optional)</span>
          </FormLabel>
          <FormControl>
            <Textarea {...field} rows={3} placeholder={placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const custom = color && isCustomColor(color) ? color : "";

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={error} />

        <FormSection title="Basic information" icon={Building2}>
          <TextField<AcademyInput> name="academyName" label="Academy name" placeholder="e.g. Fazam Football Academy" />
          <TextField<AcademyInput> name="tagline" label="Tagline" placeholder="e.g. Building champions" />
          {area("description", "About the academy", "A sentence or two about the academy")}
        </FormSection>

        <FormSection title="Contacts" icon={MapPin}>
          <TextField<AcademyInput> name="address" label="Address" className="@md:col-span-2" placeholder="e.g. Eastleigh, Nairobi" />
          <TextField<AcademyInput> name="phone" label="Phone" type="tel" placeholder="0712 345 678" />
          <TextField<AcademyInput> name="email" label="Email" type="email" placeholder="info@example.com" />
        </FormSection>

        <FormSection title="How parents pay" icon={Wallet} description="Printed on every invoice.">
          <TextField<AcademyInput> name="paymentType" label="Payment method" placeholder="e.g. M-Pesa Paybill" />
          <TextField<AcademyInput> name="paymentMethod" label="Number or account" className="[&_input]:font-mono" placeholder="e.g. 123456" />
        </FormSection>

        <FormSection title="Receipts" icon={Receipt} columns={1}>
          {area("footerNotes", "Receipt footer", "e.g. Thank you for your payment.")}
        </FormSection>

        <FormSection title="Branding" icon={Palette}>
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Logo <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <LocalFsUpload value={field.value ?? ""} onChange={field.onChange} folder="PROFILE" maxSizeMB={2} />
                </FormControl>
                <FormDescription>PNG or JPG, up to 2 MB.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="primaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colour</FormLabel>
                <div role="radiogroup" aria-label="Colour" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {COLOR_PRESETS.map((p) => {
                    const on = field.value === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => field.onChange(p.value)}
                        className={cn("flex items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors hover:bg-muted", on && "border-primary bg-primary/5")}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: SWATCH[p.value] }}>
                          {on && <Check className="size-3.5 text-white" />}
                        </span>
                        {p.label}
                      </button>
                    );
                  })}
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors hover:bg-muted",
                      custom && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="relative size-6 shrink-0 overflow-hidden rounded-full" style={{ background: custom || "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
                      <input
                        type="color"
                        aria-label="Custom colour"
                        value={custom || "#1d4ed8"}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                    </span>
                    Custom
                  </label>
                </div>
                {custom && (
                  <FormControl>
                    <Input value={custom} onChange={(e) => field.onChange(e.target.value)} aria-label="Colour code" className="h-11 font-mono" />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preview in the chosen colour */}
          <div aria-hidden {...themeAttributes(custom && !readableOnWhite(custom) ? null : color)} className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4 @md:col-span-2">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Preview</span>
            <Button type="button" size="sm" tabIndex={-1}>
              Button
            </Button>
            <Badge variant="outline" className="border-primary/40 text-primary">
              Scheduled
            </Badge>
            <span className="text-sm font-medium text-primary underline-offset-4 hover:underline">A link</span>
          </div>
        </FormSection>

        <StickyActions className="justify-end">
          {form.formState.isDirty && (
            <Button type="button" variant="ghost" onClick={() => form.reset()}>
              Undo changes
            </Button>
          )}
          <Button type="submit" disabled={saving || (!!academy && !form.formState.isDirty)} className="min-w-36">
            {saving && <Loader2 className="animate-spin" />} {academy ? "Save changes" : "Set up academy"}
          </Button>
        </StickyActions>
      </form>
    </Form>
  );
}
