"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AtSign, CalendarClock, Clock, Hourglass, Hash, IdCard, Loader2, Receipt, Send, Server, UserMinus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ListField } from "@/components/form/ListField";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { REGISTRATION_DOCUMENTS } from "@/features/athletes/schemas/registration";
import { saveSettings, sendTestEmail } from "../actions/preferences";
import { PREFERENCE_SCHEMAS, type PreferenceInput, type PreferenceSection } from "../schemas/preferences";

const NO_PLAN = "none";

/** One Settings section's fields, saved together. */
export function PreferencesForm<S extends PreferenceSection>({
  section,
  values,
  plans = [],
  passwordSaved = false,
}: {
  section: S;
  values: PreferenceInput<S>;
  plans?: { id: string; name: string }[];
  /** Emails: a mail server password is stored */
  passwordSaved?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [testing, startTest] = useTransition();
  const form = useForm<FieldValues>({
    resolver: zodResolver(PREFERENCE_SCHEMAS[section] as never),
    defaultValues: values as FieldValues,
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty);

  const submit = form.handleSubmit(() =>
    start(async () => {
      setError(null);
      // Send what was typed; the server parses it with the same schema
      const res = await saveSettings(section, form.getValues() as PreferenceInput<S>);
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      // A typed password is saved now; clear it from the screen
      form.reset(section === "emails" ? { ...form.getValues(), smtpPassword: "" } : form.getValues());
      queryClient.invalidateQueries({ queryKey: ["utils"] });
      router.refresh();
    }),
  );

  const area = (name: string, label: string, placeholder: string, hint?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="@md:col-span-2">
          <FormLabel>
            {label} <span className="font-normal text-muted-foreground">(optional)</span>
          </FormLabel>
          <FormControl>
            <Textarea {...field} value={field.value ?? ""} rows={3} placeholder={placeholder} />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const toggle = (name: string, label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
          <FormLabel className="leading-snug">{label}</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );

  const test = () =>
    startTest(async () => {
      const res = await sendTestEmail();
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormAlert message={error} />

        {section === "documents" && (
          <>
            <FormSection title="Numbering" icon={Hash} description="New numbers read like INV-20261018-001.">
              <TextField name="invoicePrefix" label="Invoice letters" autoComplete="off" className="[&_input]:font-mono [&_input]:uppercase" />
              <TextField name="receiptPrefix" label="Receipt letters" autoComplete="off" className="[&_input]:font-mono [&_input]:uppercase" />
            </FormSection>
            <FormSection title="Invoices" icon={Receipt}>
              <TextField name="invoiceDueDays" label="Due after (days)" inputMode="numeric" hint="New invoices start with this due date." />
              <TextField name="kraPin" label="KRA PIN" optional autoComplete="off" placeholder="P051234567X" className="[&_input]:font-mono [&_input]:uppercase" />
              {area("documentTerms", "Terms", "e.g. Fees once paid are not refundable.", "Printed at the bottom of every invoice.")}
            </FormSection>
          </>
        )}

        {section === "fees" && (
          <FormSection title="New athletes" icon={Wallet}>
            <FormField
              control={form.control}
              name="defaultPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Fee plan picked first <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <Select value={field.value || NO_PLAN} onValueChange={(v) => field.onChange(v === NO_PLAN ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PLAN}>None, choose each time</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        )}

        {section === "fees" && (
          <FormSection title="Late fees" icon={Hourglass}>
            <TextField name="lateFeeAmount" label="Late fee (KES)" optional inputMode="decimal" hint="Leave empty for no late fees." />
            <TextField name="lateFeeGraceDays" label="Charged after overdue for (days)" inputMode="numeric" />
          </FormSection>
        )}

        {section === "security" && (
          <FormSection title="Signing out" icon={Clock}>
            <TextField
              name="sessionTimeoutMinutes"
              label="Sign out after idle for (minutes)"
              optional
              inputMode="numeric"
              hint="Leave empty to stay signed in."
            />
          </FormSection>
        )}

        {section === "attendance" && (
          <>
            <FormSection title="Sessions" icon={CalendarClock}>
              <TextField name="sessionMinutes" label="Session length (minutes)" inputMode="numeric" hint="New sessions start with this length." />
              <TextField
                name="attendanceEditDays"
                label="Coaches can change attendance for (days)"
                optional
                inputMode="numeric"
                hint="Leave empty for no limit."
              />
            </FormSection>
            <FormSection title="Inactive athletes" icon={UserMinus}>
              <TextField name="inactiveWeeks" label="Mark inactive after (weeks without training)" inputMode="numeric" />
            </FormSection>
          </>
        )}

        {section === "emails" && (
          <>
            <FormSection title="Sender" icon={AtSign}>
              <TextField name="senderName" label="From name" optional placeholder="Fazam Football Academy" />
              <TextField name="senderEmail" label="From address" optional type="email" autoComplete="off" placeholder="accounts@example.com" />
              <TextField name="replyTo" label="Replies go to" optional type="email" autoComplete="off" />
            </FormSection>

            <FormSection
              title="Mail server"
              icon={Server}
              aside={
                <Button type="button" variant="outline" size="sm" onClick={test} disabled={testing || form.formState.isDirty}>
                  {testing ? <Loader2 className="animate-spin" /> : <Send />} Send test email
                </Button>
              }
            >
              <TextField name="smtpHost" label="Server" optional autoComplete="off" placeholder="mail.example.com" />
              <TextField name="smtpPort" label="Port" optional inputMode="numeric" placeholder="465" />
              <TextField name="smtpUser" label="Username" optional autoComplete="off" />
              <TextField
                name="smtpPassword"
                label="Password"
                optional
                type="password"
                autoComplete="new-password"
                placeholder={passwordSaved ? "Saved. Type to replace it" : undefined}
              />
              {toggle("smtpSecure", "Secure connection (SSL/TLS)")}
            </FormSection>

            <FormSection title="Emails to guardians" icon={Send} columns={1}>
              {toggle("emailInvoices", "New invoices, with the PDF attached")}
              {toggle("emailReceipts", "Receipts for payments")}
              {toggle("emailOverdue", "Reminders for overdue invoices, at most once a week")}
            </FormSection>

            <FormSection title="Weekly finance report" icon={Receipt} columns={1} description="Sent every Monday morning.">
              <ListField name="financeReportTo" itemLabel="email" placeholder="name@example.com" emptyText="No one yet." max={10} />
            </FormSection>
          </>
        )}

        {section === "registration" && (
          <FormSection title="Documents to collect" icon={IdCard} columns={1}>
            <FormField
              control={form.control}
              name="requiredDocuments"
              render={({ field }) => (
                <FormItem>
                  <ChoiceChips
                    label="Required documents"
                    multiple
                    options={REGISTRATION_DOCUMENTS.map((d) => ({ value: d.value, label: d.label }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormDescription>Pick none to leave them all optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        )}

        <StickyActions className="mx-0 justify-end px-0 sm:mx-0 sm:px-0">
          {form.formState.isDirty && (
            <Button type="button" variant="ghost" onClick={() => form.reset()}>
              Undo changes
            </Button>
          )}
          <Button type="submit" disabled={saving || !form.formState.isDirty} className="min-w-36">
            {saving && <Loader2 className="animate-spin" />} Save changes
          </Button>
        </StickyActions>
      </form>
    </Form>
  );
}
