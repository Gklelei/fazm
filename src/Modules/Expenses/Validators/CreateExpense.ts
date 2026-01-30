import z from "zod";

const requiredString = z.string().trim().min(1, "This field is required");
const optionalString = z.string().trim().optional();

export const CreateExpenseSchema = z.object({
  name: requiredString,
  description: optionalString,
  category: requiredString,
  amount: z.coerce
    .number({ error: "Amount should be a valid number" })
    .min(0, "Amount cannot be less than zero"),
  date: z.coerce
    .date({ error: "expense date should be a valid date" })
    .refine((val) => val < new Date(), {
      error: "You cannot select a future date",
    })
    .min(1, "This Field is required"),
});

export type ClientCreateExpenseType = z.input<typeof CreateExpenseSchema>;
export type ServerCreateExpenseType = z.infer<typeof CreateExpenseSchema>;
