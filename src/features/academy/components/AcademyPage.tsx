"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Check, Loader2, MapPin, Palette, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { LocalFsUpload } from "@/components/shared/LocalFsUpload";
import { APP_THEMES, COLOR_PRESETS, isCustomColor, readableOnWhite, themeAttributes } from "@/lib/brand-color";
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

/** A tiny working copy of the app (sidebar, header, a button) in a theme and colour. */
function MiniApp({ theme, color, className }: { theme: string; color: string; className?: string }) {
  const safe = isCustomColor(color) && !readableOnWhite(color) ? null : color;
  return (
    <div aria-hidden {...themeAttributes(safe, theme)} className={cn("flex h-24 overflow-hidden rounded-md border bg-background", className)}>
      <div className="flex w-[30%] flex-col gap-1.5 bg-sidebar p-2">
        <span className="h-1.5 w-3/4 rounded-full bg-sidebar-foreground/40" />
        <span className="mt-1 flex items-center gap-1 rounded-sm bg-sidebar-accent px-1 py-1">
          <span className="h-2.5 w-0.5 rounded-full bg-sidebar-primary" />
          <span className="h-1.5 flex-1 rounded-full bg-sidebar-accent-foreground/80" />
        </span>
        <span className="h-1.5 w-2/3 rounded-full bg-sidebar-foreground/30" />
        <span className="h-1.5 w-1/2 rounded-full bg-sidebar-foreground/30" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        <span className="h-2 w-1/2 rounded-full bg-foreground/70" />
        <span className="h-1.5 w-3/4 rounded-full bg-muted-foreground/30" />
        <span className="mt-auto ml-auto h-4 w-12 rounded bg-primary" />
      </div>
    </div>
  );
}

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
      theme: academy?.theme || "fazam",
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
            name="theme"
            render={({ field }) => (
              <FormItem className="@md:col-span-2">
                <FormLabel>Theme</FormLabel>
                <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3 @xl:grid-cols-4">
                  {APP_THEMES.map((t) => {
                    const on = field.value === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => {
                          field.onChange(t.value);
                          form.setValue("primaryColor", t.highlight, { shouldDirty: true, shouldValidate: true });
                        }}
                        className={cn("space-y-2 rounded-lg border p-2 text-left transition-colors hover:bg-muted", on && "border-primary bg-primary/5 ring-1 ring-primary")}
                      >
                        <MiniApp theme={t.value} color={on ? color : t.highlight} />
                        <span className="flex items-center justify-between px-1 text-sm font-medium">
                          {t.label}
                          {on && <Check className="size-4 text-primary" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Buttons and links</FormLabel>
                <div role="radiogroup" aria-label="Buttons and links colour" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
