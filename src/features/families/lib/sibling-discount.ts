import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getSettings } from "@/lib/settings";
import { discountFor } from "@/features/coupons/lib/redeem";

/**
 * The sibling discount on a new fees invoice, from Settings → Fees: for every
 * child in a family except the first registered. 0 when it doesn't apply.
 */
export async function siblingDiscountFor(tx: Prisma.TransactionClient, athleteId: string, lines: { amount: unknown; subscriptionPlanId: string | null }[]) {
  const { siblingDiscountType: discountType, siblingDiscountValue: value } = await getSettings();
  if (!discountType || !value) return 0;
  const a = await tx.athlete.findUnique({ where: { athleteId }, select: { familyId: true } });
  if (!a?.familyId) return 0;
  const first = await tx.athlete.findFirst({ where: { familyId: a.familyId, isArchived: false }, orderBy: [{ createdAt: "asc" }, { athleteId: "asc" }], select: { athleteId: true } });
  if (!first || first.athleteId === athleteId) return 0;
  return discountFor({ discountType, value: new Prisma.Decimal(value), plans: [] }, lines);
}
