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
  const of = async (athleteId: string) => db.invoice.findFirstOrThrow({ where: { athleteId } });
  return { first: await of(first.athleteId), second: await of(second.athleteId) };
}

describe("sibling discount", () => {
  beforeEach(resetDb);

  it("goes on fees invoices for every child after the first registered", async () => {
    const { first, second } = await setup("PERCENTAGE", 10);
    expect([Number(first.discount), first.siblingDiscount]).toEqual([0, false]);
    expect([Number(second.discount), second.siblingDiscount, second.couponId]).toEqual([300, true, null]);
  });

  it("keeps the bigger discount when a coupon is applied", async () => {
    const { second } = await setup("FIXED_AMOUNT", 500);
    await createCoupon({ name: "SMALL", discountType: "PERCENTAGE", value: 5, interval: "ONCE", startDate: "2026-01-01", expiryDate: "", usageLimit: "", oncePerAthlete: false, plans: [] });
    await createCoupon({ name: "BIG", discountType: "PERCENTAGE", value: 50, interval: "ONCE", startDate: "2026-01-01", expiryDate: "", usageLimit: "", oncePerAthlete: false, plans: [] });

    expect((await applyCouponToInvoice(second.invoiceNumber, "SMALL")).message).toMatch(/^The sibling discount \(Ksh.500\) is bigger, so it stays\.$/);
    expect((await applyCouponToInvoice(second.invoiceNumber, "BIG")).success).toBe(true);
    const after = await db.invoice.findUniqueOrThrow({ where: { id: second.id } });
    expect([Number(after.discount), after.siblingDiscount]).toEqual([1500, false]);
  });
});
