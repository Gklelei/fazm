import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

const text = (max = 100) => z.string().trim().max(max, `Keep it under ${max} characters`);
const phone = (what: string) =>
  z
    .string()
    .trim()
    .refine((v) => !v || normalizePhone(v) !== null, `Enter ${what} as a Kenyan mobile number, like 0712 345 678`)
    .transform((v) => (v ? normalizePhone(v)! : ""));

/** What people change on their own profile. Role, email and pay details are changed by an admin. */
export const myProfileSchema = z
  .object({
    fullNames: text(100).min(1, "Enter your name"),
    photo: text(300),
    phoneNumber: phone("your phone"),
    emergencyName: text(100),
    emergencyRelationship: text(40),
    emergencyPhone: phone("the emergency phone"),
  })
  .superRefine((v, ctx) => {
    if (v.emergencyName && !v.emergencyPhone) ctx.addIssue({ code: "custom", path: ["emergencyPhone"], message: "Enter the emergency phone" });
  });

export type MyProfileInput = z.input<typeof myProfileSchema>;
