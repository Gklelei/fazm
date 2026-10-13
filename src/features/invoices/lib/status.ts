import type { INVOICE_STATUS } from "@/generated/prisma/enums";

/**
 * An invoice's status from what has been paid against it. Unpaid or partly
 * paid invoices past their due date are OVERDUE, so removing or reducing a
 * payment never silently turns an overdue invoice back into PENDING.
 */
export function invoiceStatusFor(
  totalPaid: number,
  amountDue: number,
  dueDate: Date,
  now = new Date(),
): INVOICE_STATUS {
  if (totalPaid >= amountDue) return "PAID";
  if (dueDate < now) return "OVERDUE";
  return totalPaid > 0 ? "PARTIAL" : "PENDING";
}
