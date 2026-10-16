import { z } from "zod";

/** Shared by the invoice form (browser) and the actions (server). */

export const INVOICE_TYPES = [
  { value: "SUBSCRIPTION", label: "Fees" },
  { value: "ITEM_PURCHASE", label: "Item" },
  { value: "LATE_FEE", label: "Late fee" },
  { value: "MANUAL", label: "Other" },
] as const;

const money = z.coerce
  .number({ error: "Enter an amount" })
  .positive("Enter an amount above 0")
  .max(10_000_000, "That amount is too large")
  .refine((n) => Math.round(n * 100) === n * 100, "Use at most 2 decimal places");

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Describe the charge").max(120, "Keep it under 120 characters"),
  quantity: z.coerce.number({ error: "Enter a quantity" }).int("Whole numbers only").min(1, "At least 1").max(99, "Up to 99"),
  unitAmount: money,
  /** Set when the line was added from a fee plan */
  subscriptionPlanId: z.string().optional(),
});

const invoiceFields = z.object({
  type: z.enum(["SUBSCRIPTION", "ITEM_PURCHASE", "LATE_FEE", "MANUAL"]),
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line").max(20, "Up to 20 lines"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date"),
  notes: z.string().trim().max(500, "Keep it under 500 characters"),
});

export const editInvoiceSchema = invoiceFields;
export const createInvoiceSchema = invoiceFields.extend({
  /** One invoice each; the form fills this from chosen batches and athletes */
  athletes: z.array(z.string().min(1)).min(1, "Choose who to bill").max(1000, "Up to 1,000 athletes at a time"),
});

export type InvoiceLineInput = z.input<typeof invoiceLineSchema>;
export type EditInvoiceInput = z.input<typeof editInvoiceSchema>;
export type CreateInvoiceInput = z.input<typeof createInvoiceSchema>;

/** Line total and invoice total, in cents to avoid floating-point drift. */
export const lineTotal = (l: { quantity: unknown; unitAmount: unknown }) =>
  Math.round(Number(l.quantity) * Math.round(Number(l.unitAmount) * 100)) / 100;
export const invoiceTotal = (lines: { quantity: unknown; unitAmount: unknown }[]) =>
  Math.round(lines.reduce((sum, l) => sum + Math.round(lineTotal(l) * 100), 0)) / 100;
