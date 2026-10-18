import { z } from "zod";
import { REGISTRATION_DOCUMENTS } from "@/features/athletes/schemas/registration";

/** Shared by the Settings forms (browser) and saveSettings (server). Inputs are strings; outputs are what's stored. */
const whole = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((n) => n >= min && n <= max, message);
const wholeOrEmpty = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), message)
    .transform((v) => (v ? Number(v) : null));
const prefix = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,6}$/, "Use 2 to 6 letters");

export const PREFERENCE_SCHEMAS = {
  documents: z
    .object({
      invoicePrefix: prefix,
      receiptPrefix: prefix,
      invoiceDueDays: whole(0, 90, "Enter 0 to 90 days"),
      kraPin: z
        .string()
        .trim()
        .toUpperCase()
        .refine((v) => !v || /^[A-Z]\d{9}[A-Z]$/.test(v), "Enter a PIN like P051234567X")
        .transform((v) => v || null),
      documentTerms: z
        .string()
        .trim()
        .max(600, "Keep it under 600 characters")
        .transform((v) => v || null),
    })
    .refine((v) => v.invoicePrefix !== v.receiptPrefix, { path: ["receiptPrefix"], message: "Use different letters from invoices" }),
  fees: z.object({
    defaultPlanId: z.string().transform((v) => v || null),
  }),
  attendance: z.object({
    sessionMinutes: whole(15, 300, "Enter 15 to 300 minutes"),
    attendanceEditDays: wholeOrEmpty(0, 60, "Enter 0 to 60 days, or leave it empty"),
    inactiveWeeks: whole(2, 52, "Enter 2 to 52 weeks"),
  }),
  registration: z.object({
    requiredDocuments: z.array(z.enum(REGISTRATION_DOCUMENTS.map((d) => d.value) as [string, ...string[]])).max(REGISTRATION_DOCUMENTS.length),
  }),
};

export type PreferenceSection = keyof typeof PREFERENCE_SCHEMAS;
export type PreferenceInput<S extends PreferenceSection> = z.input<(typeof PREFERENCE_SCHEMAS)[S]>;
