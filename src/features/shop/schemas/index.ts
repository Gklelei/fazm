import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  { value: "JERSEY", label: "Jersey" },
  { value: "SHIRT", label: "Shirt" },
  { value: "SHORTS", label: "Shorts" },
  { value: "SOCKS", label: "Socks" },
  { value: "OTHER", label: "Other" },
] as const;
export const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const KID_SIZES = ["6-7", "8-9", "10-11", "12-13", "14-15"] as const;
export const SALE_PAYMENTS = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "CASH", label: "Cash" },
  { value: "ACCOUNT", label: "Athlete's account" },
] as const;

const money = z.coerce.number({ error: "Enter the price" }).positive("Enter the price").max(1_000_000, "That's too much");
const count = (msg: string) => z.coerce.number({ error: msg }).int(msg).min(0, msg).max(100_000, msg);

export const productSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Enter a name").max(60),
    category: z.enum(["JERSEY", "SHIRT", "SHORTS", "SOCKS", "OTHER"]),
    description: z.string().trim().max(300).default(""),
    photo: z.string().trim().refine((v) => !v || /^\/uploads\/PRODUCTS\/[\w.-]+$/.test(v), "Upload the photo again").default(""),
    price: money,
    variants: z
      .array(z.object({ id: z.string().optional(), size: z.string().trim().max(20).default(""), colour: z.string().trim().max(20).default(""), opening: count("Enter a whole number").default(0) }))
      .min(1, "Add at least one size")
      .max(40),
  })
  .refine((p) => new Set(p.variants.map((v) => `${v.size.toLowerCase()}|${v.colour.toLowerCase()}`)).size === p.variants.length, { message: "Each size and colour once", path: ["variants"] });
export type ProductInput = z.input<typeof productSchema>;

export const receiveSchema = z.object({
  lines: z.array(z.object({ variantId: z.string().min(1), quantity: count("Enter whole numbers") })).max(40),
  note: z.string().trim().max(200).default(""),
});
export type ReceiveInput = z.input<typeof receiveSchema>;

export const adjustSchema = z.object({
  variantId: z.string().min(1),
  count: count("Enter the number you counted"),
  note: z.string().trim().min(1, "Say why it changed, e.g. damaged or counted").max(200),
});
export type AdjustInput = z.input<typeof adjustSchema>;

export const saleSchema = z
  .object({
    athleteId: z.string().default(""),
    customerName: z.string().trim().max(80).default(""),
    payment: z.enum(["MPESA", "CASH", "ACCOUNT"]),
    reference: z.string().trim().max(60).default(""),
    notes: z.string().trim().max(300).default(""),
    lines: z
      .array(z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1, "At least 1").max(500) }))
      .min(1, "Add something to the sale")
      .max(40),
  })
  .refine((s) => s.payment !== "ACCOUNT" || s.athleteId, { message: "Pick the athlete to charge", path: ["athleteId"] });
export type SaleInput = z.input<typeof saleSchema>;
