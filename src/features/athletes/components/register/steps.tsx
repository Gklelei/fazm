"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { FileField } from "@/components/form/FileField";
import { FormSection } from "@/components/form/FormSection";
import { ListField } from "@/components/form/ListField";
import { TextField } from "@/components/form/TextField";
import { academyToday, formatAcademy } from "@/lib/academy-time";
import { BILLING_DAY, nextMonthlyBillingDate } from "@/lib/billing";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { CONSENT_TEXT, CONSENT_VERSION } from "../../lib/consent-text";
import {
  ADULT_AGE,
  BLOOD_GROUPS,
  POSITIONS,
  RELATIONSHIPS,
  SIDES,
  ageOn,
  type RegistrationInput,
} from "../../schemas/registration";

export type StepProps = { goTo: (step: number) => void };
const useRegForm = () => useFormContext<RegistrationInput>();

/** Age from the date of birth while typing, or null. */
function useAge() {
  const dob = useWatch<RegistrationInput, "dateOfBirth">({ name: "dateOfBirth" });
  return /^\d{4}-\d{2}-\d{2}$/.test(dob ?? "") && dob <= academyToday() ? ageOn(dob) : null;
}

/** Batches named by age (U7, U9...): the youngest one the athlete is still under. */
function suggestBatch(age: number, batches: { id: string; name: string }[]) {
  const byAge = batches
    .map((s) => ({ ...s, under: Number(/^U(\d+)$/i.exec(s.name.trim())?.[1]) }))
    .filter((s) => s.under)
    .sort((a, b) => a.under - b.under);
  return byAge.find((s) => age < s.under) ?? batches.find((s) => /senior/i.test(s.name));
}

export function StepAthlete() {
  const { control, setValue, getValues } = useRegForm();
  const batches = (UseUtilsContext().data?.batches ?? []).filter((b) => !/unassigned/i.test(b.name));
  const age = useAge();
  const suggested = age !== null ? suggestBatch(age, batches) : undefined;

  // Fill the batch from the age, unless one was already chosen
  useEffect(() => {
    if (suggested && !getValues("batch")) setValue("batch", suggested.id, { shouldDirty: true });
  }, [suggested, getValues, setValue]);

  return (
    <div className="space-y-8">
      <FormSection title="Name">
        <TextField<RegistrationInput> name="firstName" label="First name" autoComplete="off" autoFocus />
        <TextField<RegistrationInput> name="middleName" label="Middle name" optional autoComplete="off" />
        <TextField<RegistrationInput> name="lastName" label="Last name" autoComplete="off" className="sm:col-span-2" />
      </FormSection>
      <FormSection title="Age and batch">
        <TextField<RegistrationInput>
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          max={academyToday()}
          hint={age !== null ? `${age} years old` : undefined}
        />
        <FormField
          control={control}
          name="batch"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batch</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full data-[size=default]:h-11">
                    <SelectValue placeholder="Choose a batch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {batches.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.id === suggested?.id && " (suggested)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>
      <FormSection title="Athlete's contacts">
        <TextField<RegistrationInput> name="phoneNumber" label="Phone" optional type="tel" inputMode="tel" placeholder="0712 345 678" autoComplete="off" />
        <TextField<RegistrationInput> name="email" label="Email" optional type="email" inputMode="email" autoComplete="off" />
      </FormSection>
    </div>
  );
}

function RelationshipField({ name, label }: { name: "guardianRelationship" | "emergencyRelationship" | "consentRelationship"; label: string }) {
  const { control, clearErrors } = useRegForm();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{label}</FormLabel>
          <ChoiceChips label={label} options={RELATIONSHIPS} value={field.value} onChange={(v) => {
                  field.onChange(v);
                  clearErrors(field.name);
                }} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function StepGuardian() {
  const age = useAge();
  const adult = age !== null && age >= ADULT_AGE;
  return (
    <FormSection title="Parent or guardian">
      <TextField<RegistrationInput> name="guardianName" label="Full name" optional={adult} autoComplete="off" className="sm:col-span-2" />
      <RelationshipField name="guardianRelationship" label="Relationship" />
      <TextField<RegistrationInput> name="guardianPhone" label="Phone" optional={adult} type="tel" inputMode="tel" placeholder="0712 345 678" autoComplete="off" />
      <TextField<RegistrationInput> name="guardianEmail" label="Email" optional type="email" inputMode="email" autoComplete="off" />
    </FormSection>
  );
}

export function StepMedical() {
  const { control, setValue, getValues, clearErrors } = useRegForm();
  const guardianName = useWatch<RegistrationInput, "guardianName">({ name: "guardianName" });
  const [eName, eRel, ePhone] = useWatch<RegistrationInput, ["emergencyName", "emergencyRelationship", "emergencyPhone"]>({
    name: ["emergencyName", "emergencyRelationship", "emergencyPhone"],
  });
  const g = getValues();
  const sameAsGuardian = !!guardianName && eName === g.guardianName && eRel === g.guardianRelationship && ePhone === g.guardianPhone;

  return (
    <div className="space-y-8">
      <FormSection title="Health">
        <FormField
          control={control}
          name="bloodGroup"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Blood group</FormLabel>
              <ChoiceChips
                label="Blood group"
                options={BLOOD_GROUPS.map((b) => ({ value: b, label: b === "UNKNOWN" ? "Don't know" : b }))}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  clearErrors(field.name);
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <Label>Allergies</Label>
          <ListField<RegistrationInput> name="allergies" itemLabel="allergy" placeholder="e.g. Peanuts" emptyText="None recorded." />
        </div>
        <div className="space-y-2">
          <Label>Medical conditions</Label>
          <ListField<RegistrationInput> name="medicalConditions" itemLabel="condition" placeholder="e.g. Asthma" emptyText="None recorded." />
        </div>
      </FormSection>
      <FormSection title="Emergency contact">
        {guardianName && (
          <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm sm:col-span-2">
            <span>
              Same as the parent or guardian <span className="text-muted-foreground">({guardianName})</span>
            </span>
            <Switch
              checked={sameAsGuardian}
              onCheckedChange={(on) => {
                const v = getValues();
                setValue("emergencyName", on ? v.guardianName : "", { shouldValidate: on, shouldDirty: true });
                setValue("emergencyRelationship", on ? v.guardianRelationship : "", { shouldValidate: on, shouldDirty: true });
                setValue("emergencyPhone", on ? v.guardianPhone : "", { shouldValidate: on, shouldDirty: true });
              }}
            />
          </label>
        )}
        <TextField<RegistrationInput> name="emergencyName" label="Name" autoComplete="off" />
        <TextField<RegistrationInput> name="emergencyPhone" label="Phone" type="tel" inputMode="tel" placeholder="0712 345 678" autoComplete="off" />
        <RelationshipField name="emergencyRelationship" label="Relationship" />
      </FormSection>
    </div>
  );
}

export function StepAbout() {
  const { control, clearErrors } = useRegForm();
  const chips = (name: "foot" | "hand" | "positions", label: string, multiple = false) => (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(multiple && "sm:col-span-2")}>
          <FormLabel>
            {label}
            {multiple && <span className="font-normal text-muted-foreground">(choose any)</span>}
          </FormLabel>
          <ChoiceChips label={label} options={multiple ? POSITIONS : SIDES} value={field.value as string[]} multiple={multiple} onChange={(v) => {
                  field.onChange(v);
                  clearErrors(field.name);
                }} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
  return (
    <div className="space-y-8">
      <FormSection title="Where they live">
        <TextField<RegistrationInput> name="town" label="Town" placeholder="e.g. Nairobi" autoComplete="off" />
        <TextField<RegistrationInput> name="estate" label="Estate or area" placeholder="e.g. Eastleigh" autoComplete="off" />
        <TextField<RegistrationInput> name="addressLine1" label="Street or building" optional autoComplete="off" className="sm:col-span-2" />
      </FormSection>
      <FormSection title="Football">
        <TextField<RegistrationInput> name="height" label="Height (cm)" optional type="number" inputMode="numeric" min={50} max={230} />
        <TextField<RegistrationInput> name="weight" label="Weight (kg)" optional type="number" inputMode="decimal" min={10} max={150} />
        {chips("foot", "Stronger foot")}
        {chips("hand", "Stronger hand")}
        {chips("positions", "Positions", true)}
      </FormSection>
    </div>
  );
}

function ConsentBox({ name, title, body }: { name: "consentDataUse" | "consentEmergency" | "consentPhotos"; title: string; body: string }) {
  const { control, clearErrors } = useRegForm();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("rounded-lg border p-4 sm:col-span-2", field.value && "border-primary/50 bg-primary/5")}>
          <div className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => {
                  field.onChange(v === true);
                  if (v === true) clearErrors(name);
                }}
                className="mt-0.5 size-5"
              />
            </FormControl>
            <div className="space-y-1.5">
              <FormLabel className="text-base leading-snug">
                {title}
              </FormLabel>
              <FormDescription className="leading-relaxed">{body}</FormDescription>
              <FormMessage />
            </div>
          </div>
        </FormItem>
      )}
    />
  );
}

export function StepConsent() {
  const { control, getValues, setValue, clearErrors } = useRegForm();
  const age = useAge();
  const adult = age !== null && age >= ADULT_AGE;
  const [lang, method] = useWatch<RegistrationInput, ["consentLanguage", "consentMethod"]>({ name: ["consentLanguage", "consentMethod"] });
  const t = CONSENT_TEXT[lang ?? "en"];

  // Who consents: the guardian under 18, the athlete at 18 and over
  useEffect(() => {
    const v = getValues();
    if (v.consentGivenBy) return;
    if (adult) {
      setValue("consentGivenBy", [v.firstName, v.lastName].filter(Boolean).join(" "));
      setValue("consentRelationship", "Self");
    } else if (v.guardianName) {
      setValue("consentGivenBy", v.guardianName);
      setValue("consentRelationship", v.guardianRelationship);
    }
  }, [adult, getValues, setValue]);

  return (
    <div className="space-y-8">
      <FormSection title="Consent" description={`Version ${CONSENT_VERSION}`} columns={1}>
        <FormField
          control={control}
          name="consentLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Language</FormLabel>
              <ChoiceChips
                label="Language"
                options={[
                  { value: "en", label: "English" },
                  { value: "sw", label: "Kiswahili" },
                ]}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  clearErrors(field.name);
                }}
              />
            </FormItem>
          )}
        />
        <ConsentBox name="consentDataUse" {...t.dataUse} />
        <ConsentBox name="consentEmergency" {...t.emergency} />
        <ConsentBox name="consentPhotos" {...t.photos} />
      </FormSection>

      <FormSection title="Given by">
        <TextField<RegistrationInput> name="consentGivenBy" label="Name" autoComplete="off" />
        {adult ? (
          <TextField<RegistrationInput> name="consentRelationship" label="Relationship to the athlete" />
        ) : (
          <RelationshipField name="consentRelationship" label="Relationship to the athlete" />
        )}
        <FormField
          control={control}
          name="consentMethod"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>How it was given</FormLabel>
              <ChoiceChips
                label="How consent was given"
                options={[
                  { value: "IN_PERSON", label: "In person, at the office" },
                  { value: "SIGNED_FORM", label: "Signed paper form" },
                ]}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  clearErrors(field.name);
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {method === "SIGNED_FORM" && (
          <FormField
            control={control}
            name="consentFormUrl"
            render={({ field, fieldState }) => (
              <FormItem className="sm:col-span-2">
                <FileField label="Signed consent form" folder="CONSENT_FORMS" value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <TextField<RegistrationInput> name="consentDate" label="Date" type="date" max={academyToday()} />
      </FormSection>
    </div>
  );
}

export function StepDocuments() {
  const { control } = useRegForm();
  const photos = useWatch<RegistrationInput, "consentPhotos">({ name: "consentPhotos" });
  const doc = (name: "birthCertificate" | "idFront" | "idBack" | "passportCover" | "passportPage", label: string, folder: string) => (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FileField label={label} folder={folder} value={field.value} onChange={field.onChange} />
        </FormItem>
      )}
    />
  );
  return (
    <div className="space-y-8">
      <FormSection title="Photo" columns={1}>
        {photos ? (
          <FormField
            control={control}
            name="profilePhoto"
            render={({ field, fieldState }) => (
              <FormItem className="sm:col-span-2">
                <FileField label="Profile photo" folder="PROFILE" accept="image/jpeg,image/png,image/webp" imagePreview value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground sm:col-span-2">
            To add a photo, tick photos and videos in the consent step.
          </p>
        )}
      </FormSection>
      <FormSection title="Documents" columns={1}>
        {doc("birthCertificate", "Birth certificate", "BIRTH_CERTIFICATES")}
        {doc("idFront", "National ID, front", "NATIONAL_IDENTIFICATIONS")}
        {doc("idBack", "National ID, back", "NATIONAL_IDENTIFICATIONS")}
        {doc("passportCover", "Passport cover", "PASSPORTS")}
        {doc("passportPage", "Passport bio-data page", "PASSPORTS")}
      </FormSection>
    </div>
  );
}

const money = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export function StepPlan({ goTo }: StepProps) {
  const { control, getValues } = useRegForm();
  const utils = UseUtilsContext().data;
  const plans = utils?.plans ?? [];
  const planId = useWatch<RegistrationInput, "subscriptionPlanId">({ name: "subscriptionPlanId" });
  const plan = plans.find((p) => p.id === planId);
  const v = getValues();
  const batch = utils?.batches.find((b) => b.id === v.batch)?.name;
  const due = plan?.interval === "MONTHLY" ? nextMonthlyBillingDate(new Date(), BILLING_DAY) : null;

  const rows: { step: number; title: string; lines: string[] }[] = [
    {
      step: 0,
      title: "Athlete",
      lines: [
        [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" "),
        `Born ${v.dateOfBirth ? formatAcademy(`${v.dateOfBirth}T09:00:00Z`, { day: "numeric", month: "long", year: "numeric" }) : "—"}${v.dateOfBirth ? ` (${ageOn(v.dateOfBirth)})` : ""}, ${batch ?? "no batch"}`,
        [v.phoneNumber && formatPhone(normalizePhone(v.phoneNumber) ?? v.phoneNumber), v.email].filter(Boolean).join(" · "),
      ],
    },
    {
      step: 1,
      title: "Parent or guardian",
      lines: v.guardianName ? [`${v.guardianName} (${v.guardianRelationship})`, [formatPhone(normalizePhone(v.guardianPhone) ?? v.guardianPhone), v.guardianEmail].filter(Boolean).join(" · ")] : ["None"],
    },
    {
      step: 2,
      title: "Medical and emergency",
      lines: [
        `Blood group ${v.bloodGroup === "UNKNOWN" ? "not known" : v.bloodGroup}`,
        `Allergies: ${v.allergies.map((a) => a.name).filter(Boolean).join(", ") || "none"}; conditions: ${v.medicalConditions.map((a) => a.name).filter(Boolean).join(", ") || "none"}`,
        `Emergency: ${v.emergencyName} (${v.emergencyRelationship}), ${formatPhone(normalizePhone(v.emergencyPhone) ?? v.emergencyPhone)}`,
      ],
    },
    {
      step: 3,
      title: "Address and football",
      lines: [[v.addressLine1, v.estate, v.town].filter(Boolean).join(", "), [v.positions.join(", "), `${v.foot} foot`].filter(Boolean).join(" · ")],
    },
    {
      step: 4,
      title: "Consent",
      lines: [
        `By ${v.consentGivenBy} (${v.consentRelationship}), ${v.consentMethod === "SIGNED_FORM" ? "signed form" : "in person"}, ${v.consentDate ? formatAcademy(`${v.consentDate}T09:00:00Z`, { day: "numeric", month: "long", year: "numeric" }) : ""}`,
        `Data and emergency treatment: yes · Photos and videos: ${v.consentPhotos ? "yes" : "no"}`,
      ],
    },
    {
      step: 5,
      title: "Photo and documents",
      lines: [
        [v.profilePhoto && "Photo", v.birthCertificate && "Birth certificate", (v.idFront || v.idBack) && "National ID", (v.passportCover || v.passportPage) && "Passport"].filter(Boolean).join(", ") || "None yet",
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <FormSection title="Fee plan">
        <FormField
          control={control}
          name="subscriptionPlanId"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={field.value === p.id}
                    onClick={() => field.onChange(p.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      field.value === p.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
                    )}
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="tabular text-sm text-muted-foreground">
                      {money(Number(p.amount))} · {String(p.interval).toLowerCase()}
                    </p>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {plan && (
          <p className="rounded-md bg-muted p-3 text-sm sm:col-span-2">
            First invoice: <strong className="tabular">{money(Number(plan.amount))}</strong>
            {due && <>, due {formatAcademy(due, { day: "numeric", month: "long", year: "numeric" })}</>}.
          </p>
        )}
      </FormSection>

      <FormSection title="Review" columns={1}>
        <dl className="divide-y rounded-lg border">
          {rows.map((r) => (
            <div key={r.title} className="flex items-start justify-between gap-4 p-3 text-sm">
              <div className="min-w-0 space-y-0.5">
                <dt className="font-medium">{r.title}</dt>
                {r.lines.filter(Boolean).map((l, i) => (
                  <dd key={i} className="break-words text-muted-foreground">
                    {l}
                  </dd>
                ))}
              </div>
              <button type="button" onClick={() => goTo(r.step)} className="shrink-0 text-sm font-medium text-primary hover:underline">
                Edit
              </button>
            </div>
          ))}
        </dl>
      </FormSection>
    </div>
  );
}

