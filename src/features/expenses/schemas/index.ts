import z from "zod";

export const ExpenseSchema = z.object({
  category: z.enum([
    "FOOD_SUPPLIES",
    "PLAYING_KITS",
    "STATIONERY",
    "TALKTIME",
    "TRANSPORT",
  ]),
  description: z.string().trim().min(1, "Description is required"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: "Valid amount required (e.g., 10.50)",
    }),
  dateIncurred: z.string().trim().min(1, "Date is required"),
  status: z.enum(["PAID", "PENDING"]),
});

export const ExpenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  description: z.string().optional(),
});

export type ExpenseType = z.infer<typeof ExpenseSchema>;
export type ExpenseCategoryType = z.infer<typeof ExpenseCategorySchema>;
