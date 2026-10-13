import { format } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";

type Kind = "INV" | "FEES";

/**
 * Next invoice / receipt numbers for a day, e.g. INV-20261013-007.
 *
 * Must run inside an interactive `$transaction`: a transaction-scoped
 * advisory lock per kind+day makes concurrent creators queue instead of
 * counting the same rows and colliding on the unique number (the old
 * count()+1 approach). The next number continues from the highest one
 * already issued that day, so deleted rows never cause reuse.
 */
export async function nextDocumentNumbers(
  tx: Prisma.TransactionClient,
  kind: Kind,
  count = 1,
  at = new Date(),
): Promise<string[]> {
  const prefix = `${kind}-${format(at, "yyyyMMdd")}-`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))::text`;

  const issued =
    kind === "INV"
      ? (
          await tx.invoice.findMany({
            where: { invoiceNumber: { startsWith: prefix } },
            select: { invoiceNumber: true },
          })
        ).map((r) => r.invoiceNumber)
      : (
          await tx.finance.findMany({
            where: { receiptNumber: { startsWith: prefix } },
            select: { receiptNumber: true },
          })
        ).map((r) => r.receiptNumber);

  const last = Math.max(0, ...issued.map((n) => Number(n.slice(prefix.length)) || 0));
  return Array.from(
    { length: count },
    (_, i) => `${prefix}${String(last + 1 + i).padStart(3, "0")}`,
  );
}
