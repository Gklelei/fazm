import { z } from "zod";

export const couponSchema = z
  .object({
    name: z
      .string()
      .min(2, "Coupon code must be at least 2 characters")
      .max(20, "Coupon code is too long (max 20 characters)")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Code can only contain letters, numbers, and underscores",
      ),

    discountType: z
      .string()
      .min(1, "This field is required")
      .refine((data) => ["PERCENTAGE", "FIXED_AMOUNT"].includes(data)),
    value: z.coerce
      .number<number>({ error: "Discount value must be a number" })
      .positive("Discount must be greater than zero")
      .refine((val) => val > 0, "Value must be positive"),

    interval: z
      .string()
      .trim()
      .min(1, "Select if this is a one-time or repeating discount")
      .refine((data) => ["ONCE", "REPEATING"].includes(data), {
        error: "Please select a valid interval",
      }),

    startDate: z.date({
      error: "Please select a start date",
    }),

    expiryDate: z.date().optional(),

    usageLimit: z
      .number()
      .int("Limit must be a whole number")
      .positive("Limit must be at least 1")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.expiryDate && data.expiryDate < data.startDate) {
        return false;
      }
      return true;
    },
    {
      message: "Expiry date cannot be before the start date",
      path: ["expiryDate"],
    },
  );

export type couponSchemaType = z.infer<typeof couponSchema>;
