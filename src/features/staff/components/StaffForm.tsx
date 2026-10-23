"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FilePlus2, FileText, KeyRound, Landmark, Loader2, Siren, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { DocumentTile } from "@/components/form/DocumentTile";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { PhotoField } from "@/components/form/PhotoField";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { useUpload } from "@/components/form/use-upload";
import { useAuthSession } from "@/providers/SessionProvider";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { createStaff, updateStaff } from "../actions/save-staff";
import { PAY_BASES, PAY_METHODS, STAFF_DOCUMENT_KINDS, STAFF_ROLES, staffSchema, type StaffInput, type StaffValues } from "../schemas";
import { TempPasswordDialog } from "./TempPasswordDialog";

const EMPTY: StaffInput = {
  fullNames: "",
  phoneNumber: "",
  email: "",
  photo: "",
  jobTitle: "",
  startDate: "",
  nationalId: "",
  kraPin: "",
  nssfNumber: "",
  shifNumber: "",
  salary: "",
  payBasis: "",
  sessionRate: "",
  payMethod: "",
  payAccount: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  batches: [],
  documents: [],
  canSignIn: false,
  payrollAccess: false,
  role: "COACH",
};

// Chips can't select an empty value
const BASIS_CHIPS = PAY_BASES.map((o) => ({ ...o, value: o.value || "NONE" }));

/** A small "Add contract" button that uploads one file. */
function AddDocument({ label, onAdd }: { label: string; onAdd: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useUpload("STAFF_DOCUMENTS", onAdd);
  return (
    <span className="grid gap-1">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" className="border-dashed" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <FilePlus2 />} Add {label.startsWith("ID") ? label : label.toLowerCase()}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

/** Add or edit a staff member: who they are, sign-in, batches, contacts, pay details and documents. */
export function StaffForm({
  staffId,
  values,
  self,
  canEditPay = false,
  canGrantPayroll = false,
}: {
  staffId?: string;
  values?: StaffInput;
  self?: boolean;
  /** The payroll person sees and changes pay details */
  canEditPay?: boolean;
  /** The super admin decides who runs payroll */
  canGrantPayroll?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuthSession();
  const batches = UseUtilsContext().data?.batches ?? [];
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [issued, setIssued] = useState<{ staffId: string; password: string } | null>(null);

  const form = useForm<StaffInput, unknown, StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: values ?? EMPTY,
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty && !saved);
  const docs = useFieldArray({ control: form.control, name: "documents" });
  const [canSignIn, fullNames, email, watchedDocs, payBasis, payMethod] = useWatch({ control: form.control, name: ["canSignIn", "fullNames", "email", "documents", "payBasis", "payMethod"] });
  const roles = STAFF_ROLES.filter((r) => r.value !== "SUPER_ADMIN" || user.role === "SUPER_ADMIN" || values?.role === "SUPER_ADMIN");

  const submit = form.handleSubmit((v) =>
    start(async () => {
      setError(null);
      const res = staffId ? await updateStaff(staffId, v) : await createStaff(v);
      if (!res.success) return setError(res.message);
      setSaved(true);
      toast.success(res.message);
      const done = res as unknown as { staffId: string; tempPassword: string | null };
      const id = done.staffId;
      if (done.tempPassword) return setIssued({ staffId: id, password: done.tempPassword });
      router.push(`/staff/${id}`);
      router.refresh();
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <FormAlert message={error} />
        <div className="space-y-4">
          <FormSection title="Person" icon={UserRound}>
            <FormField
              control={form.control}
              name="photo"
              render={({ field }) => (
                <FormItem className="@md:col-span-2">
                  <PhotoField folder="PROFILE" value={field.value ?? ""} onChange={field.onChange} />
                </FormItem>
              )}
            />
            <TextField<StaffInput> name="fullNames" label="Full name" autoComplete="off" />
            <TextField<StaffInput> name="jobTitle" label="Job title" optional placeholder="e.g. Head coach" />
            <TextField<StaffInput> name="phoneNumber" label="Phone" type="tel" inputMode="tel" placeholder="0712 345 678" />
            <TextField<StaffInput> name="email" label="Email" type="email" optional={!canSignIn} autoComplete="off" />
            <TextField<StaffInput> name="startDate" label="Started" type="date" optional />
          </FormSection>

          <FormSection title="Sign-in" icon={KeyRound} columns={1}>
            <FormField
              control={form.control}
              name="canSignIn"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <FormLabel className="grid gap-0.5">
                    <span>Can sign in to the app</span>
                    <span className="font-normal text-muted-foreground">
                      {self ? "Another admin can change your sign-in." : field.value ? "They sign in with their email." : "Off: they're kept on staff without a login."}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={self} />
                  </FormControl>
                </FormItem>
              )}
            />
            {canSignIn && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <ChoiceChips label="Role" options={roles} value={field.value} onChange={(v) => !self && field.onChange(v)} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {canSignIn && canGrantPayroll && (
              <FormField
                control={form.control}
                name="payrollAccess"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <FormLabel className="grid gap-0.5">
                      <span>Payroll access</span>
                      <span className="font-normal text-muted-foreground">Salaries, advances and payslips. One person at a time.</span>
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </FormSection>

          <FormSection title="Batches they coach" icon={Users} columns={1}>
            <FormField
              control={form.control}
              name="batches"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Batches</FormLabel>
                  <ChoiceChips label="Batches" multiple options={batches.map((b) => ({ value: b.id, label: b.name }))} value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Emergency contact" icon={Siren}>
            <TextField<StaffInput> name="emergencyName" label="Name" optional autoComplete="off" />
            <TextField<StaffInput> name="emergencyRelationship" label="Relationship" optional placeholder="e.g. Spouse" />
            <TextField<StaffInput> name="emergencyPhone" label="Phone" optional type="tel" inputMode="tel" />
          </FormSection>

          <FormSection title={canEditPay ? "Pay and statutory details" : "Statutory details"} icon={Landmark}>
            {canEditPay && (
              <>
                <FormField
                  control={form.control}
                  name="payBasis"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Paid</FormLabel>
                      <ChoiceChips label="Paid" options={BASIS_CHIPS} value={field.value || "NONE"} onChange={(v) => field.onChange(v === "NONE" ? "" : v)} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {payBasis !== "PER_SESSION" && <TextField<StaffInput> name="salary" label="Monthly salary (KES)" optional={payBasis !== "MONTHLY"} inputMode="decimal" />}
                {payBasis === "PER_SESSION" && <TextField<StaffInput> name="sessionRate" label="Pay per session (KES)" inputMode="decimal" />}
                {payBasis && (
                  <>
                    <FormField
                      control={form.control}
                      name="payMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pay by</FormLabel>
                          <ChoiceChips label="Pay by" options={PAY_METHODS} value={field.value || undefined} onChange={(v) => field.onChange(v === field.value ? "" : v)} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {payMethod && <TextField<StaffInput> name="payAccount" label={payMethod === "BANK" ? "Bank and account number" : "M-Pesa number"} autoComplete="off" />}
                  </>
                )}
              </>
            )}
            <TextField<StaffInput> name="nationalId" label="National ID" optional inputMode="numeric" autoComplete="off" />
            <TextField<StaffInput> name="kraPin" label="KRA PIN" optional autoComplete="off" className="[&_input]:uppercase" />
            <TextField<StaffInput> name="nssfNumber" label="NSSF number" optional autoComplete="off" />
            <TextField<StaffInput> name="shifNumber" label="SHIF number" optional autoComplete="off" />
          </FormSection>

          <FormSection title="Documents" icon={FileText} columns={1}>
            <div className="flex flex-wrap gap-2">
              {STAFF_DOCUMENT_KINDS.map((k) => (
                <AddDocument key={k.value} label={k.label} onAdd={(url) => docs.append({ kind: k.value, name: k.label, url })} />
              ))}
            </div>
            <div className="grid gap-4 empty:hidden sm:grid-cols-2 lg:grid-cols-3">
              {docs.fields.map((d, i) => (
                <div key={d.id} className="space-y-2">
                  <DocumentTile
                    label={watchedDocs?.[i]?.name || d.kind}
                    folder="STAFF_DOCUMENTS"
                    value={watchedDocs?.[i]?.url ?? d.url}
                    onChange={(url) => (url ? form.setValue(`documents.${i}.url`, url, { shouldDirty: true }) : docs.remove(i))}
                  />
                  <FormField
                    control={form.control}
                    name={`documents.${i}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Document name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name, e.g. First aid certificate" className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </FormSection>
        </div>

        <StickyActions>
          <Button variant="ghost" asChild>
            <Link href={staffId ? `/staff/${staffId}` : "/staff"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || (!!staffId && !form.formState.isDirty)} className="min-w-36">
            {saving && <Loader2 className="animate-spin" />}
            {staffId ? "Save changes" : "Add staff"}
          </Button>
        </StickyActions>
      </form>

      <TempPasswordDialog
        name={fullNames}
        email={email}
        password={issued?.password ?? null}
        onClose={() => {
          router.push(`/staff/${issued!.staffId}`);
          router.refresh();
        }}
      />
    </Form>
  );
}
