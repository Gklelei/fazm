import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");
const optionalString = z.string().optional().or(z.literal(""));
const dateStringSchema = z.string().refine(
  (val) => {
    if (!val) return false;
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: "Invalid date format" },
);

const amountSchema = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
    message: "Must be a valid amount with up to 2 decimal places",
  });

export const CreateInvoiceSchema = z
  .object({
    athleteId: z
      .array(requiredString)
      .min(1, "At least one athlete must be selected"),

    subScriptionName: requiredString,

    subScriptionAmount: amountSchema,

    subscriptionInterval: z.enum(["MONTHLY", "WEEKLY", "DAILY", "ONCE"]),

    startDate: dateStringSchema,

    // status: z.enum(["ACTIVE", "PAUSED", "CANCELED", "EXPIRED"]),

    dueDate: dateStringSchema,

    subType: requiredString,

    description: optionalString,
  })
  .refine(
    (data) => {
      const startDate = new Date(data.startDate);
      const dueDate = new Date(data.dueDate);
      return dueDate >= startDate;
    },
    {
      message: "Due date must be on or after start date",
      path: ["dueDate"],
    },
  );

export type CreateInvoiceSchemaType = z.infer<typeof CreateInvoiceSchema>;

interface SelectOption {
  name: string;
  value: string;
}

export const SUBSCRIPTION_TYPES: SelectOption[] = [
  { name: "Subscription", value: "SUBSCRIPTION" },
  { name: "Manual Entry", value: "MANUAL" },
  { name: "Late Fee / Penalty", value: "LATE_FEE" },
  { name: "Item Purchase (Jersey/Boots/etc..)", value: "ITEM_PURCHASE" },
];

export const SUBSCRIPTION_INTERVAL: SelectOption[] = [
  { name: "Monthly", value: "MONTHLY" },
  { name: "Weekly", value: "WEEKLY" },
  { name: "Daily", value: "DAILY" },
  { name: "One-time Only", value: "ONCE" },
];
