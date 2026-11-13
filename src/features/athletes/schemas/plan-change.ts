// Plain module: the plan choices in the Transfer and Change plan dialogs, checked on the server too
import { z } from "zod";

/**
 * What happens to an athlete's fee plan:
 * - NEXT_BILL: the new plan from the next billing day; nothing billed now
 * - RESTART: the old plan ends today, the new one starts today and its first bill is raised now
 * - KEEP: stay on the plan they have (Transfer, when it fits the new programme)
 * - STOP: end the plan and start none; the invoice form flags them "No plan"
 */
export const PLAN_CHOICES = ["NEXT_BILL", "RESTART", "KEEP", "STOP"] as const;
export type PlanChoice = (typeof PLAN_CHOICES)[number];

/** With RESTART, the bill already raised on the old plan: kept, cancelled (unpaid only), or credited */
export const OLD_BILL_CHOICES = ["KEEP", "CANCEL", "CREDIT"] as const;
export type OldBillChoice = (typeof OLD_BILL_CHOICES)[number];

export const planChangeSchema = z
  .object({
    choice: z.enum(PLAN_CHOICES),
    planId: z.string().optional(),
    oldBill: z.enum(OLD_BILL_CHOICES).default("KEEP"),
    /** The old plan's bill to cancel or credit (its invoice number) */
    oldInvoice: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.choice === "NEXT_BILL" || v.choice === "RESTART") && !v.planId) {
      ctx.addIssue({ code: "custom", path: ["planId"], message: "Choose a fee plan." });
    }
    if (v.choice === "RESTART" && v.oldBill !== "KEEP" && !v.oldInvoice) {
      ctx.addIssue({ code: "custom", path: ["oldInvoice"], message: "Choose the bill on their current plan." });
    }
  });
export type PlanChangeInput = z.input<typeof planChangeSchema>;
