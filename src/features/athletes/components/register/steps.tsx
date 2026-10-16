"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { DocumentTile } from "@/components/form/DocumentTile";
import { PhotoField } from "@/components/form/PhotoField";
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

export type StepProps = {
  goTo: (step: number) => void;
  /** Edit page: health details read-only (not admin or medical staff) */
  lockHealth?: boolean;
  /** Edit page: emergency contact read-only (medical staff) */
  lockContact?: boolean;
};
const useRegForm = () => useFormContext<RegistrationInput>();

/** Age from the date of birth while typing, or null. */
function useAge() {
  const dob = useWatch<RegistrationInput, "dateOfBirth">({
    name: "dateOfBirth",
  });
  return /^\d{4}-\d{2}-\d{2}$/.test(dob ?? "") && dob <= academyToday()
    ? ageOn(dob)
    : null;
}

/** Batches named by age (U7, U9...): the youngest one the athlete is still under. */
function suggestBatch(age: number, batches: { id: string; name: string }[]) {
  const byAge = batches
    .map((s) => ({ ...s, under: Number(/^U(\d+)$/i.exec(s.name.trim())?.[1]) }))
    .filter((s) => s.under)
    .sort((a, b) => a.under - b.under);
  return (
    byAge.find((s) => age < s.under) ??
    batches.find((s) => /senior/i.test(s.name))
  );
}

export function StepAthlete() {
  const { control, setValue, getValues } = useRegForm();
  const batches = (UseUtilsContext().data?.batches ?? []).filter(
    (b) => !/unassigned/i.test(b.name),
  );
  const age = useAge();
  const suggested = age !== null ? suggestBatch(age, batches) : undefined;

  // Fill the batch from the age, unless one was already chosen
  useEffect(() => {
    if (suggested && !getValues("batch"))
      setValue("batch", suggested.id, { shouldDirty: true });
  }, [suggested, getValues, setValue]);

  return (
    <div className="space-y-8">
      <FormSection title="Name">
        <TextField<RegistrationInput>
          name="firstName"
          label="First name"
          autoComplete="off"
          autoFocus
        />
        <TextField<RegistrationInput>
          name="middleName"
          label="Middle name"
          optional
          autoComplete="off"
        />
        <TextField<RegistrationInput>
          name="lastName"
          label="Last name"
          autoComplete="off"
          className="sm:col-span-2"
        />
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
        <TextField<RegistrationInput>
          name="phoneNumber"
          label="Phone"
          optional
          type="tel"
          inputMode="tel"
          placeholder="0712 345 678"
          autoComplete="off"
        />
        <TextField<RegistrationInput>
          name="email"
          label="Email"
          optional
          type="email"
          inputMode="email"
          autoComplete="off"
        />
      </FormSection>
    </div>
  );
}

function RelationshipField({
  name,
  label,
}: {
  name:
    "guardianRelationship" | "emergencyRelationship" | "consentRelationship";
  label: string;
}) {
  const { control, clearErrors } = useRegForm();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{label}</FormLabel>
          <ChoiceChips
            label={label}
            options={RELATIONSHIPS}
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
  );
}

export function StepGuardian() {
  const age = useAge();
  const adult = age !== null && age >= ADULT_AGE;
  return (
    <FormSection title="Parent or guardian">
      <TextField<RegistrationInput>
        name="guardianName"
        label="Full name"
        optional={adult}
        autoComplete="off"
        className="sm:col-span-2"
      />
      <RelationshipField name="guardianRelationship" label="Relationship" />
      <TextField<RegistrationInput>
        name="guardianPhone"
        label="Phone"
        optional={adult}
        type="tel"
        inputMode="tel"
        placeholder="0712 345 678"
        autoComplete="off"
      />
      <TextField<RegistrationInput>
        name="guardianEmail"
        label="Email"
        optional
        type="email"
        inputMode="email"
        autoComplete="off"
      />
    </FormSection>
  );
}

export function StepMedical({ lockHealth, lockContact }: StepProps) {
  const { control, setValue, getValues, clearErrors } = useRegForm();
  const guardianName = useWatch<RegistrationInput, "guardianName">({
    name: "guardianName",
  });
  const [eName, eRel, ePhone] = useWatch<
    RegistrationInput,
    ["emergencyName", "emergencyRelationship", "emergencyPhone"]
  >({
    name: ["emergencyName", "emergencyRelationship", "emergencyPhone"],
  });
  const g = getValues();
  const sameAsGuardian =
    !!guardianName &&
    eName === g.guardianName &&
    eRel === g.guardianRelationship &&
    ePhone === g.guardianPhone;

  return (
    <div className="space-y-8">
      <fieldset disabled={lockHealth} className="disabled:opacity-70">
        <FormSection title="Health">
          <FormField
            control={control}
            name="bloodGroup"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Blood group</FormLabel>
                <ChoiceChips
                  label="Blood group"
                  options={BLOOD_GROUPS.map((b) => ({
                    value: b,
                    label: b === "UNKNOWN" ? "Don't know" : b,
                  }))}
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
            <ListField<RegistrationInput>
              name="allergies"
              itemLabel="allergy"
              placeholder="e.g. Peanuts"
              emptyText="None recorded."
            />
          </div>
          <div className="space-y-2">
            <Label>Medical conditions</Label>
            <ListField<RegistrationInput>
              name="medicalConditions"
              itemLabel="condition"
              placeholder="e.g. Asthma"
              emptyText="None recorded."
            />
          </div>
        </FormSection>
      </fieldset>
      <fieldset disabled={lockContact} className="disabled:opacity-70">
        <FormSection title="Emergency contact">
          {guardianName && (
            <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm sm:col-span-2">
              <span>
                Same as the parent or guardian{" "}
                <span className="text-muted-foreground">({guardianName})</span>
              </span>
              <Switch
                checked={sameAsGuardian}
                onCheckedChange={(on) => {
                  const v = getValues();
                  setValue("emergencyName", on ? v.guardianName : "", {
                    shouldValidate: on,
                    shouldDirty: true,
                  });
                  setValue(
                    "emergencyRelationship",
                    on ? v.guardianRelationship : "",
                    { shouldValidate: on, shouldDirty: true },
                  );
                  setValue("emergencyPhone", on ? v.guardianPhone : "", {
                    shouldValidate: on,
                    shouldDirty: true,
                  });
                }}
              />
            </label>
          )}
          <TextField<RegistrationInput>
            name="emergencyName"
            label="Name"
            autoComplete="off"
          />
          <TextField<RegistrationInput>
            name="emergencyPhone"
            label="Phone"
            type="tel"
            inputMode="tel"
            placeholder="0712 345 678"
            autoComplete="off"
          />
          <RelationshipField
            name="emergencyRelationship"
            label="Relationship"
          />
        </FormSection>
      </fieldset>
    </div>
  );
}

export function StepAbout() {
  const { control, clearErrors } = useRegForm();
  const chips = (
    name: "foot" | "hand" | "positions",
    label: string,
    multiple = false,
  ) => (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(multiple && "sm:col-span-2")}>
          <FormLabel>
            {label}
            {multiple && (
              <span className="font-normal text-muted-foreground">
                (choose any)
              </span>
            )}
          </FormLabel>
          <ChoiceChips
            label={label}
            options={multiple ? POSITIONS : SIDES}
            value={field.value as string[]}
            multiple={multiple}
            onChange={(v) => {
              field.onChange(v);
              clearErrors(field.name);
            }}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
  return (
    <div className="space-y-8">
      <FormSection title="Where they live">
        <TextField<RegistrationInput>
          name="town"
          label="Town"
          placeholder="e.g. Nairobi"
          autoComplete="off"
        />
        <TextField<RegistrationInput>
          name="estate"
          label="Estate or area"
          placeholder="e.g. Eastleigh"
          autoComplete="off"
        />
        <TextField<RegistrationInput>
          name="addressLine1"
          label="Street or building"
          optional
          autoComplete="off"
          className="sm:col-span-2"
        />
      </FormSection>
      <FormSection title="Football">
        <TextField<RegistrationInput>
          name="height"
          label="Height (cm)"
          optional
          type="number"
          inputMode="numeric"
          min={50}
          max={230}
        />
        <TextField<RegistrationInput>
          name="weight"
          label="Weight (kg)"
          optional
          type="number"
          inputMode="decimal"
          min={10}
          max={150}
        />
        {chips("foot", "Stronger foot")}
        {chips("hand", "Stronger hand")}
        {chips("positions", "Positions", true)}
      </FormSection>
    </div>
  );
}

function ConsentBox({
  name,
  title,
  body,
}: {
  name: "consentDataUse" | "consentEmergency" | "consentPhotos";
  title: string;
  body: string;
}) {
  const { control, clearErrors } = useRegForm();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "rounded-lg border p-4 sm:col-span-2",
            field.value && "border-primary/50 bg-primary/5",
          )}
        >
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
              <FormLabel className="text-base leading-snug">{title}</FormLabel>
              <FormDescription className="leading-relaxed">
                {body}
              </FormDescription>
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
  const [lang, method] = useWatch<
    RegistrationInput,
    ["consentLanguage", "consentMethod"]
  >({ name: ["consentLanguage", "consentMethod"] });
  const t = CONSENT_TEXT[lang ?? "en"];

  // Who consents: the guardian under 18, the athlete at 18 and over
  useEffect(() => {
    const v = getValues();
    if (v.consentGivenBy) return;
    if (adult) {
      setValue(
        "consentGivenBy",
        [v.firstName, v.lastName].filter(Boolean).join(" "),
      );
      setValue("consentRelationship", "Self");
    } else if (v.guardianName) {
      setValue("consentGivenBy", v.guardianName);
      setValue("consentRelationship", v.guardianRelationship);
    }
  }, [adult, getValues, setValue]);

  return (
    <div className="space-y-8">
      <FormSection
        title="Consent"
        description={`Version ${CONSENT_VERSION}`}
        columns={1}
      >
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
        <TextField<RegistrationInput>
          name="consentGivenBy"
          label="Name"
          autoComplete="off"
        />
        {adult ? (
          <TextField<RegistrationInput>
            name="consentRelationship"
            label="Relationship to the athlete"
          />
        ) : (
          <RelationshipField
            name="consentRelationship"
            label="Relationship to the athlete"
          />
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
                <div className="max-w-xs">
                  <DocumentTile
                    label="Signed consent form"
                    folder="CONSENT_FORMS"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!fieldState.error}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <TextField<RegistrationInput>
          name="consentDate"
          label="Date"
          type="date"
          max={academyToday()}
        />
      </FormSection>
    </div>
  );
}

export function StepDocuments() {
  const { control, clearErrors } = useRegForm();
  const photos = useWatch<RegistrationInput, "consentPhotos">({
    name: "consentPhotos",
  });
  const tile = (
    name:
      | "birthCertificate"
      | "idFront"
      | "idBack"
      | "passportCover"
      | "passportPage",
    label: string,
    folder: string,
  ) => (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <DocumentTile
          label={label}
          folder={folder}
          value={field.value}
          onChange={field.onChange}
        />
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
              <FormItem>
                <PhotoField
                  folder="PROFILE"
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    clearErrors("profilePhoto");
                  }}
                  invalid={!!fieldState.error}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            To add a photo, tick photos and videos in the consent step.
          </p>
        )}
      </FormSection>

      <FormSection
        title="Documents"
        description="Photos or PDFs, up to 10 MB each."
        columns={1}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Birth certificate</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tile("birthCertificate", "Certificate", "BIRTH_CERTIFICATES")}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">National ID</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tile("idFront", "Front", "NATIONAL_IDENTIFICATIONS")}
              {tile("idBack", "Back", "NATIONAL_IDENTIFICATIONS")}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Passport</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tile("passportCover", "Cover", "PASSPORTS")}
              {tile("passportPage", "Bio-data page", "PASSPORTS")}
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

const money = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export function StepPlan() {
  const { control, clearErrors } = useRegForm();
  const plans = UseUtilsContext().data?.plans ?? [];
  const planId = useWatch<RegistrationInput, "subscriptionPlanId">({
    name: "subscriptionPlanId",
  });
  const plan = plans.find((p) => p.id === planId);
  const due =
    plan?.interval === "MONTHLY"
      ? nextMonthlyBillingDate(new Date(), BILLING_DAY)
      : null;

  return (
    <FormSection title="Fee plan" columns={1}>
      <FormField
        control={control}
        name="subscriptionPlanId"
        render={({ field }) => (
          <FormItem>
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((p) => {
                const on = field.value === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      field.onChange(p.id);
                      clearErrors("subscriptionPlanId");
                    }}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border p-4 text-left transition-colors",
                      on
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {String(p.interval).toLowerCase()}
                      </span>
                    </span>
                    <span className="tabular font-display text-xl font-bold">
                      {money(Number(p.amount))}
                    </span>
                  </button>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      {plan && (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-4">
          <div>
            <p className="text-sm text-muted-foreground">First invoice</p>
            {due && (
              <p className="text-sm">
                Due{" "}
                {formatAcademy(due, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <p className="tabular font-display text-2xl font-bold">
            {money(Number(plan.amount))}
          </p>
        </div>
      )}
    </FormSection>
  );
}

/** One review card: a heading with Edit, then label/value rows. */
function ReviewCard({
  title,
  onEdit,
  rows,
  children,
}: {
  title: string;
  onEdit: () => void;
  rows: [string, React.ReactNode][];
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="font-display text-base font-semibold tracking-wide uppercase">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-primary hover:underline"
        >
          Edit
        </button>
      </header>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 p-4 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export function StepReview({ goTo }: StepProps) {
  const { getValues } = useRegForm();
  const utils = UseUtilsContext().data;
  const v = getValues();
  const plan = utils?.plans.find((p) => p.id === v.subscriptionPlanId);
  const batch = utils?.batches.find((b) => b.id === v.batch)?.name;
  const day = (ymd: string) =>
    ymd
      ? formatAcademy(`${ymd}T09:00:00Z`, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
  const phone = (p: string) => formatPhone(normalizePhone(p) ?? p);
  const list = (rows: { name: string }[]) =>
    rows
      .map((r) => r.name)
      .filter(Boolean)
      .join(", ") || "None";
  const docs: [string, string][] = [
    ["Birth certificate", v.birthCertificate],
    ["ID front", v.idFront],
    ["ID back", v.idBack],
    ["Passport cover", v.passportCover],
    ["Passport bio-data", v.passportPage],
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ReviewCard
        title="Athlete"
        onEdit={() => goTo(0)}
        rows={[
          [
            "Name",
            [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" "),
          ],
          [
            "Born",
            v.dateOfBirth && `${day(v.dateOfBirth)} (${ageOn(v.dateOfBirth)})`,
          ],
          ["Batch", batch],
          ["Phone", v.phoneNumber && phone(v.phoneNumber)],
          ["Email", v.email],
        ]}
      />
      <ReviewCard
        title="Parent or guardian"
        onEdit={() => goTo(1)}
        rows={[
          [
            "Name",
            v.guardianName && `${v.guardianName} (${v.guardianRelationship})`,
          ],
          ["Phone", v.guardianPhone && phone(v.guardianPhone)],
          ["Email", v.guardianEmail],
        ]}
      />
      <ReviewCard
        title="Medical and emergency"
        onEdit={() => goTo(2)}
        rows={[
          [
            "Blood group",
            v.bloodGroup === "UNKNOWN" ? "Not known" : v.bloodGroup,
          ],
          ["Allergies", list(v.allergies)],
          ["Conditions", list(v.medicalConditions)],
          [
            "Emergency",
            `${v.emergencyName} (${v.emergencyRelationship}), ${phone(v.emergencyPhone)}`,
          ],
        ]}
      />
      <ReviewCard
        title="Address and football"
        onEdit={() => goTo(3)}
        rows={[
          [
            "Address",
            [v.addressLine1, v.estate, v.town].filter(Boolean).join(", "),
          ],
          ["Positions", v.positions.join(", ")],
          ["Foot / hand", `${cap(v.foot)} / ${cap(v.hand)}`],
          [
            "Height / weight",
            [v.height && `${v.height} cm`, v.weight && `${v.weight} kg`]
              .filter(Boolean)
              .join(" · "),
          ],
        ]}
      />
      <ReviewCard
        title="Consent"
        onEdit={() => goTo(4)}
        rows={[
          ["Given by", `${v.consentGivenBy} (${v.consentRelationship})`],
          [
            "How",
            v.consentMethod === "SIGNED_FORM" ? "Signed form" : "In person",
          ],
          ["Date", day(v.consentDate)],
          ["Data use", v.consentDataUse ? "Yes" : "No"],
          ["Emergency treatment", v.consentEmergency ? "Yes" : "No"],
          ["Photos and videos", v.consentPhotos ? "Yes" : "No"],
        ]}
      />
      <ReviewCard title="Photo and documents" onEdit={() => goTo(5)} rows={[]}>
        <div className="flex flex-wrap gap-3 p-4">
          {v.profilePhoto && (
            // eslint-disable-next-line @next/next/no-img-element -- private /uploads file
            <img
              src={v.profilePhoto}
              alt="Photo"
              className="size-16 rounded-full object-cover"
            />
          )}
          {docs
            .filter(([, url]) => url)
            .map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="grid w-24 gap-1 text-center text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="grid aspect-[3/2] place-items-center overflow-hidden rounded border bg-muted">
                  {url.toLowerCase().endsWith(".pdf") ? (
                    <span className="text-xs font-semibold">PDF</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- private /uploads file
                    <img src={url} alt="" className="size-full object-cover" />
                  )}
                </span>
                {label}
              </a>
            ))}
          {!v.profilePhoto && docs.every(([, url]) => !url) && (
            <p className="text-sm text-muted-foreground">None</p>
          )}
        </div>
      </ReviewCard>
      <ReviewCard
        title="Fee plan"
        onEdit={() => goTo(6)}
        rows={[
          ["Plan", plan?.name],
          ["First invoice", plan && money(Number(plan.amount))],
        ]}
      />
    </div>
  );
}
