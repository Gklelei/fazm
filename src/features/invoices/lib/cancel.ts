import type { Prisma } from "@/generated/prisma/client";
import { releaseDiscounts } from "@/features/coupons/lib/engine";

type Tx = Prisma.TransactionClient;

/**
 * Cancels an invoice inside a transaction: its discounts come off (coupons are released) and
 * it counts as never issued. The caller checks it may be cancelled and logs it.
 */
export async function cancelInvoiceIn(tx: Tx, invoiceId: string, by: string) {
  await releaseDiscounts(tx, invoiceId, by);
  return tx.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELED" } });
}
