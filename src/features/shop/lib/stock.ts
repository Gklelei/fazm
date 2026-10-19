import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action";

type Move = { variantId: string; quantity: number; kind: "RECEIVED" | "SOLD" | "RETURNED" | "ADJUSTED"; note?: string | null; saleId?: string; userId?: string; label?: string };

/**
 * Changes one size's stock and records the movement, in the caller's
 * transaction. Taking stock out only succeeds while enough is left, so two
 * sales of the last item can't both go through.
 */
export async function moveStock(tx: Prisma.TransactionClient, m: Move) {
  if (!m.quantity) return null;
  const { count } = await tx.productVariant.updateMany({
    where: { id: m.variantId, ...(m.quantity < 0 && { stock: { gte: -m.quantity } }) },
    data: { stock: { increment: m.quantity } },
  });
  if (!count) {
    const v = await tx.productVariant.findUnique({ where: { id: m.variantId }, select: { stock: true } });
    throw new ActionError(v ? `Only ${v.stock} left of ${m.label ?? "that size"}.` : "That size no longer exists. Refresh the page.");
  }
  const { stock } = await tx.productVariant.findUniqueOrThrow({ where: { id: m.variantId }, select: { stock: true } });
  return tx.stockMovement.create({ data: { variantId: m.variantId, kind: m.kind, quantity: m.quantity, balance: stock, note: m.note || null, saleId: m.saleId, userId: m.userId } });
}

/** SO-2026-0001: per year, continuing from the highest issued. Inside a transaction. */
export async function nextSaleNumber(tx: Prisma.TransactionClient, year: number) {
  const prefix = `SO-${year}-`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))::text`;
  const last = await tx.sale.findFirst({ where: { saleNumber: { startsWith: prefix } }, orderBy: { saleNumber: "desc" }, select: { saleNumber: true } });
  return `${prefix}${String((last ? Number(last.saleNumber.slice(prefix.length)) : 0) + 1).padStart(4, "0")}`;
}

/** "Home jersey · M · Blue" */
export const variantLabel = (product: string, v: { size: string; colour: string }) => [product, v.size, v.colour].filter(Boolean).join(" · ");
