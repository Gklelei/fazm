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

type Amount = number | string | { toString(): string } | null | undefined;

/** What is still owed on an invoice (or a sum of invoices): due, less discount, less paid. */
export function invoiceBalance(i: { amountDue: Amount; discount?: Amount; amountPaid: Amount }) {
  return Math.max(Number(i.amountDue ?? 0) - Number(i.discount ?? 0) - Number(i.amountPaid ?? 0), 0);
}
