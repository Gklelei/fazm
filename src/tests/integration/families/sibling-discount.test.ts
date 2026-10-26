import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, resetDb, signedIn } from "@/tests/support/db";
import { linkSiblings } from "@/features/families/actions/link";
import { createInvoices } from "@/features/invoices/actions/save-invoice";
import { createCoupon } from "@/features/coupons/actions/coupons";
import { applyCouponToInvoice } from "@/features/coupons/actions/redeem";

const fees = (athletes: string[]) =>
  createInvoices({ athletes, type: "SUBSCRIPTION", lines: [{ description: "Monthly training", quantity: 1, unitAmount: 3000 }], dueDate: "2026-11-30", notes: "" });

async function setup(discountType: "PERCENTAGE" | "FIXED_AMOUNT", value: number) {
  await signedIn("FINANCE");
  await db.academy.create({ data: { academyName: "Test Academy", paymentMathod: "123456", paymentMethodType: "Paybill", siblingDiscountType: discountType, siblingDiscountValue: value } });
  const first = await makeAthlete();
  const second = await makeAthlete();
  await linkSiblings(first.athleteId, second.athleteId);
  await fees([first.athleteId, second.athleteId]);
  const of = async (athleteId: string) => db.invoice.findFirstOrThrow({ where: { athleteId }, include: { discounts: true } });
  return { first: await of(first.athleteId), second: await of(second.athleteId), of };
}

describe("sibling discount", () => {
  beforeEach(resetDb);

  it("goes on fees invoices for every child after the first registered", async () => {
    const { first, second } = await setup("PERCENTAGE", 10);
    expect([Number(first.discount), first.discounts.length]).toEqual([0, 0]);
    expect([Number(second.discount), second.discounts.map((d) => [d.kind, d.label])]).toEqual([300, [["SIBLING", "Sibling discount"]]]);
  });

  // Was: the sibling discount and a coupon competed for one slot, so siblings lost their coupon
  it("adds up with a coupon, each its own line", async () => {
    const { second, of } = await setup("FIXED_AMOUNT", 500);
    await createCoupon({ name: "SMALL", discountType: "PERCENTAGE", value: 5, duration: "ONCE", durationCount: "", startDate: "2026-01-01", expiryDate: "", usageLimit: "", oncePerAthlete: false, plans: [] });
    expect((await applyCouponToInvoice(second.invoiceNumber, "SMALL")).success).toBe(true);
    const after = await of(second.athleteId);
    expect([Number(after.discount), after.discounts.map((d) => [d.kind, Number(d.amount)]).sort()]).toEqual([
      650,
      [
        ["COUPON", 150],
        ["SIBLING", 500],
      ],
    ]);
  });
});
