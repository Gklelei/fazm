import { z } from "zod";

/** Shared by the coupon form (browser) and the actions (server). */
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const couponSchema = z
  .object({
    name: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_]{2,20}$/, "Use 2 to 20 letters, numbers or _"),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    value: z.coerce.number({ error: "Enter the discount" }).positive("Enter the discount").max(10_000_000, "That's too large"),
    interval: z.enum(["ONCE", "REPEATING"]),
    startDate: ymd,
    expiryDate: z.string().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date"),
    usageLimit: z
      .string()
      .trim()
      .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1), "Enter a whole number, or leave it empty"),
    oncePerAthlete: z.boolean(),
    /** Only these fee plans' charges; none = any charge */
    plans: z.array(z.string().min(1)).max(50),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "PERCENTAGE" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Up to 100%" });
    if (v.expiryDate && v.expiryDate < v.startDate) ctx.addIssue({ code: "custom", path: ["expiryDate"], message: "Pick a date after it starts" });
  });

export type CouponInput = z.input<typeof couponSchema>;
export type CouponValues = z.output<typeof couponSchema>;
