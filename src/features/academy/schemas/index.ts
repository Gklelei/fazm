import z from "zod";
import { APP_THEMES, COLOR_PRESETS, isCustomColor, readableOnWhite } from "@/lib/brand-color";

const required = (message: string, max = 120) => z.string().trim().min(1, message).max(max, `Keep it under ${max} characters`);
const optional = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);

/** Shared by the academy profile form (browser) and saveAcademy (server). */
export const AcademySchema = z
  .object({
  academyName: required("Enter the academy's name", 80),
  tagline: required("Enter a tagline", 120),
  description: optional(600),
  address: required("Enter the address", 200),
  phone: required("Enter a phone number", 30),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email address")),
  paymentType: required("Enter how parents pay, e.g. M-Pesa Paybill", 60),
  paymentMethod: required("Enter the number or account", 60),
  paymentReference: z.enum(["", "ATHLETE_ID", "INVOICE_NUMBER"]),
  bankName: optional(80),
  bankAccountName: optional(120),
  bankAccountNumber: optional(40),
  bankBranch: optional(80),
  footerNotes: optional(300),
  logoUrl: optional(300),
  signatureUrl: optional(300),
  stampUrl: optional(300),
  theme: z.enum(APP_THEMES.map((t) => t.value) as [string, ...string[]], { error: "Pick a theme" }),
  primaryColor: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => COLOR_PRESETS.some((p) => p.value === v) || isCustomColor(v), "Pick a colour")
    .refine((v) => !isCustomColor(v) || readableOnWhite(v), "Choose a darker colour so white text on it stays readable"),
  })
  .refine((v) => v.bankAccountNumber || !(v.bankName || v.bankAccountName || v.bankBranch), {
    path: ["bankAccountNumber"],
    message: "Enter the account number, or clear the bank details",
  });

export type AcademyInput = z.input<typeof AcademySchema>;
