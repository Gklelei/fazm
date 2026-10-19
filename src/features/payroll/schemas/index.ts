import { z } from "zod";

const money = (msg: string) => z.coerce.number({ error: msg }).min(0, msg).max(10_000_000, msg);
const item = z.object({ name: z.string().trim().min(1, "Name each line").max(60), amount: money("Enter amounts like 1500").refine((n) => n > 0, "Enter an amount above 0") });

export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const ADVANCE_METHODS = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
] as const;
export const DEDUCTION_KINDS = [
  { value: "PERCENT_GROSS", label: "% of gross pay" },
  { value: "PERCENT_BASIC", label: "% of basic pay" },
  { value: "FIXED", label: "Fixed amount" },
  { value: "BANDED", label: "Tax bands" },
] as const;

export const adjustmentsSchema = z.object({
  allowances: z.array(item).max(10).default([]),
  oneOffs: z.array(item).max(10).default([]),
  advance: money("Enter the advance to take back").nullable().default(null),
});
export type AdjustmentsInput = z.input<typeof adjustmentsSchema>;

export const advanceSchema = z.object({
  staffId: z.string().min(1, "Pick who it's for"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date it was given"),
  amount: money("Enter the amount").refine((n) => n > 0, "Enter the amount"),
  method: z.enum(["MPESA", "CASH", "BANK"]),
  reference: z.string().trim().max(60).optional(),
  reason: z.string().trim().max(300).optional(),
  months: z.coerce.number().int().min(1, "Pick how many months").max(24, "24 months at most"),
});
export type AdvanceInput = z.input<typeof advanceSchema>;

const band = z.object({ upTo: z.coerce.number().positive().nullable(), rate: z.coerce.number().min(0).max(100) });
export const deductionSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Enter a name").max(40),
    kind: z.enum(["PERCENT_GROSS", "PERCENT_BASIC", "FIXED", "BANDED"]),
    value: money("Enter the rate or amount"),
    bands: z.array(band).max(10).default([]),
    relief: money("Enter the relief"),
    minimum: money("Enter the minimum").nullable(),
    maximum: money("Enter the maximum").nullable(),
    beforeTax: z.boolean(),
    employerPercent: z.coerce.number().min(0).max(500),
    enabled: z.boolean(),
    staffIds: z.array(z.string()).max(500).default([]),
  })
  .refine((d) => d.kind !== "BANDED" || d.bands.length > 0, { message: "Add at least one band", path: ["bands"] })
  .refine((d) => !d.kind.startsWith("PERCENT") || d.value <= 100, { message: "A percentage can't be over 100", path: ["value"] })
  .refine((d) => d.kind !== "BANDED" || d.bands.slice(0, -1).every((b, i) => b.upTo != null && (i === 0 || b.upTo > d.bands[i - 1].upTo!)), {
    message: "Each band must go higher than the one before; only the last can be open",
    path: ["bands"],
  });
export type DeductionInput = z.input<typeof deductionSchema>;
