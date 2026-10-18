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

const emailOrEmpty = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => !v || z.email().safeParse(v).success, "Enter an email address")
  .transform((v) => v || null);
const textOrEmpty = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => v || null);

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
  fees: z
    .object({
      defaultPlanId: z.string().transform((v) => v || null),
      lateFeeAmount: z
        .string()
        .trim()
        .refine((v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 1_000_000), "Enter an amount, or leave it empty")
        .transform((v) => (v ? Number(v) : null)),
      lateFeeGraceDays: whole(0, 90, "Enter 0 to 90 days"),
      siblingDiscountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
      siblingDiscountValue: z
        .string()
        .trim()
        .refine((v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 1_000_000), "Enter an amount, or leave it empty")
        .transform((v) => (v ? Number(v) : null)),
    })
    .refine((v) => v.siblingDiscountType !== "PERCENTAGE" || v.siblingDiscountValue == null || v.siblingDiscountValue <= 100, {
      path: ["siblingDiscountValue"],
      message: "Up to 100%",
    })
    // No amount: no sibling discount
    .transform((v) => ({ ...v, siblingDiscountType: v.siblingDiscountValue == null ? null : v.siblingDiscountType })),
  attendance: z.object({
    sessionMinutes: whole(15, 300, "Enter 15 to 300 minutes"),
    attendanceEditDays: wholeOrEmpty(0, 60, "Enter 0 to 60 days, or leave it empty"),
    inactiveWeeks: whole(2, 52, "Enter 2 to 52 weeks"),
  }),
  emails: z
    .object({
      senderName: textOrEmpty(80),
      senderEmail: emailOrEmpty,
      replyTo: emailOrEmpty,
      smtpHost: z
        .string()
        .trim()
        .toLowerCase()
        .refine((v) => !v || /^[a-z0-9.-]+$/.test(v), "Enter a server name like mail.example.com")
        .transform((v) => v || null),
      smtpPort: wholeOrEmpty(1, 65535, "Enter a port number, e.g. 465 or 587"),
      smtpUser: textOrEmpty(200),
      /** Empty keeps the saved password */
      smtpPassword: z.string().max(200, "That's too long"),
      smtpSecure: z.boolean(),
      financeReportTo: z
        .array(z.object({ name: z.string().trim().toLowerCase().pipe(z.email("Enter an email address")) }))
        .max(10, "Up to 10 people")
        .transform((rows) => [...new Set(rows.map((r) => r.name))]),
      emailInvoices: z.boolean(),
      emailReceipts: z.boolean(),
      emailOverdue: z.boolean(),
    })
    .refine((v) => !v.smtpHost || v.senderEmail, { path: ["senderEmail"], message: "Enter the address emails come from" }),
  security: z.object({
    sessionTimeoutMinutes: wholeOrEmpty(5, 720, "Enter 5 to 720 minutes, or leave it empty"),
  }),
  registration: z.object({
    requiredDocuments: z.array(z.enum(REGISTRATION_DOCUMENTS.map((d) => d.value) as [string, ...string[]])).max(REGISTRATION_DOCUMENTS.length),
  }),
};

export type PreferenceSection = keyof typeof PREFERENCE_SCHEMAS;
export type PreferenceInput<S extends PreferenceSection> = z.input<(typeof PREFERENCE_SCHEMAS)[S]>;
