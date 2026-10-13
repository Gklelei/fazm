import z from "zod";

export const PAYMENT_TYPE = [
  "CASH",
  "BANK_TRANSFER",
  "MPESA_SEND_MONEY",
  "MPESA_PAYBILL",
] as const;

const requiredString = z.string().trim().min(1, "This field is required");

/** Money typed into a form: a positive amount with at most 2 decimals. */
const amount = requiredString.refine(
  (v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0,
  "Enter an amount greater than 0",
);

export const FinanceSchema = z.object({
  amountPaid: amount,
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
  amountPaid: amount,
  paymentDate: requiredString,
  paymentType: z.enum(PAYMENT_TYPE),
  collectedBy: requiredString,
  notes: z.string().optional(),
});

export type EditFinanceSchemaType = z.infer<typeof EditFinanceSchema>;
export const ClientEditFinanceSchema = EditFinanceSchema;
export type ClientEditFinanceSchemaType = z.infer<typeof ClientEditFinanceSchema>;
