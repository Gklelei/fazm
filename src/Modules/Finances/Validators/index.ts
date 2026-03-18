import z from "zod";

export const PAYMENT_TYPE = [
  "CASH",
  "BANK_TRANSFER",
  "MPESA_SEND_MONEY",
  "MPESA_PAYBILL",
] as const;

const requiredString = z.string().trim().min(1, "This field is required");

export const FinanceSchema = z.object({
  amountPaid: requiredString,
  paymentDate: requiredString,
  paymentType: z.enum(PAYMENT_TYPE),
  collectedBy: requiredString,
  notes: z.string().optional(),
  athleteId: requiredString,
  invoiceId: requiredString,
});

export type FinanceSchemaType = z.infer<typeof FinanceSchema>;
export const ClientFinanceSchema = FinanceSchema;

export type ClientFinanceSchemaType = z.infer<typeof ClientFinanceSchema>;

export const EditFinanceSchema = z.object({
  id: requiredString,
  amountPaid: requiredString,
  paymentDate: requiredString,
  paymentType: z.enum(PAYMENT_TYPE),
  collectedBy: requiredString,
  notes: z.string().optional(),
});

export type EditFinanceSchemaType = z.infer<typeof EditFinanceSchema>;
export const ClientEditFinanceSchema = EditFinanceSchema;
export type ClientEditFinanceSchemaType = z.infer<typeof ClientEditFinanceSchema>;
