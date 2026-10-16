import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

/** Shared by the staff form (browser) and the actions (server). */

export const STAFF_ROLES = [
  { value: "COACH", label: "Coach" },
  { value: "ADMIN", label: "Admin" },
  { value: "FINANCE", label: "Finance" },
  { value: "DOCTOR", label: "Medical" },
  { value: "SUPER_ADMIN", label: "Super admin" },
] as const;

export const STAFF_DOCUMENT_KINDS = [
  { value: "ID_COPY", label: "ID copy" },
  { value: "CONTRACT", label: "Contract" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "OTHER", label: "Other" },
] as const;

const text = (max = 100) => z.string().trim().max(max, `Keep it under ${max} characters`);
const required = (what: string, max = 100) => text(max).min(1, `Enter ${what}`);
const phone = (what: string) =>
  z
    .string()
    .trim()
    .refine((v) => !v || normalizePhone(v) !== null, `Enter ${what} as a Kenyan mobile number, like 0712 345 678`)
    .transform((v) => (v ? normalizePhone(v)! : ""));
const email = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address");
const ymd = z.string().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date");

export const staffSchema = z
  .object({
    fullNames: required("their name", 100),
    phoneNumber: phone("their phone").refine((v) => v !== "", "Enter their phone"),
    email,
    photo: text(300),
    jobTitle: text(60),
    startDate: ymd,

    nationalId: text(20),
    kraPin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => !v || /^[A-Z]\d{9}[A-Z]$/.test(v), "A KRA PIN looks like A123456789B"),
    nssfNumber: text(20),
    shifNumber: text(20),
    salary: z
      .string()
      .trim()
      .refine((v) => !v || (Number(v) > 0 && Number(v) <= 10_000_000 && Math.round(Number(v) * 100) === Number(v) * 100), "Enter an amount, or leave it empty"),

    emergencyName: text(100),
    emergencyPhone: phone("the emergency phone"),
    emergencyRelationship: text(40),

    batches: z.array(z.string().min(1)).max(50),
    documents: z
      .array(
        z.object({
          kind: z.enum(["ID_COPY", "CONTRACT", "CERTIFICATE", "OTHER"]),
          name: text(80),
          url: z.string().trim().regex(/^\/uploads\/STAFF_DOCUMENTS\/[\w.-]+$/, "Upload the file again"),
        }),
      )
      .max(30, "Up to 30 documents"),

    canSignIn: z.boolean(),
    role: z.enum(["COACH", "ADMIN", "FINANCE", "DOCTOR", "SUPER_ADMIN"]),
  })
  .superRefine((v, ctx) => {
    if (v.canSignIn && !v.email) ctx.addIssue({ code: "custom", path: ["email"], message: "Enter the email they'll sign in with" });
    if (v.emergencyName && !v.emergencyPhone) ctx.addIssue({ code: "custom", path: ["emergencyPhone"], message: "Enter the emergency phone" });
  });

export type StaffInput = z.input<typeof staffSchema>;
export type StaffValues = z.output<typeof staffSchema>;
