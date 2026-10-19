import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, resetDb, signedIn } from "@/tests/support/db";
import { adjustStock, cancelSale, createSale, receiveStock, saveProduct } from "@/features/shop/actions/shop";

async function jersey() {
  await signedIn("FINANCE");
  const res = await saveProduct({ name: "Home jersey", category: "JERSEY", price: 1500, variants: [{ size: "S", opening: 3 }, { size: "M", opening: 1 }] });
  expect(res.success).toBe(true);
  const variants = await db.productVariant.findMany({ orderBy: { position: "asc" } });
  return { s: variants[0], m: variants[1] };
}
const stockOf = async (id: string) => (await db.productVariant.findUniqueOrThrow({ where: { id } })).stock;

describe("shop", () => {
  beforeEach(resetDb);

  it("records opening stock, deliveries and counts as movements", async () => {
    const { s, m } = await jersey();
    await receiveStock({ lines: [{ variantId: s.id, quantity: 5 }], note: "Delivery" });
    expect(await stockOf(s.id)).toBe(8);
    expect((await adjustStock({ variantId: m.id, count: 0, note: "Damaged" })).success).toBe(true);
    expect(await stockOf(m.id)).toBe(0);
    expect(await db.stockMovement.count()).toBe(4);
    expect((await db.stockMovement.findFirstOrThrow({ where: { kind: "ADJUSTED" } })).quantity).toBe(-1);
  });

  it("sells at catalogue prices, numbers sales per year and takes stock out", async () => {
    const { s, m } = await jersey();
    const a = await createSale({ payment: "MPESA", reference: "QWE123", lines: [{ variantId: s.id, quantity: 2 }, { variantId: m.id, quantity: 1 }] });
    const b = await createSale({ payment: "CASH", lines: [{ variantId: s.id, quantity: 1 }] });
    expect(a).toMatchObject({ success: true, saleNumber: "SO-2026-0001" });
    expect(b).toMatchObject({ saleNumber: "SO-2026-0002" });
    expect(Number((await db.sale.findUniqueOrThrow({ where: { saleNumber: "SO-2026-0001" } })).total)).toBe(4500);
    expect(await stockOf(s.id)).toBe(0);
  });

  it("refuses to sell more than is in stock and saves nothing", async () => {
    const { s, m } = await jersey();
    const res = await createSale({ payment: "CASH", lines: [{ variantId: s.id, quantity: 1 }, { variantId: m.id, quantity: 2 }] });
    expect(res).toMatchObject({ success: false, message: "Only 1 left of Home jersey · M." });
    expect(await db.sale.count()).toBe(0);
    expect(await stockOf(s.id)).toBe(3);
  });

  it("charges an athlete's account as an invoice, and cancelling restocks and cancels it", async () => {
    const { s } = await jersey();
    const athlete = await makeAthlete();
    expect((await createSale({ payment: "ACCOUNT", lines: [{ variantId: s.id, quantity: 2 }] })).success).toBe(false);
    const res = await createSale({ payment: "ACCOUNT", athleteId: athlete.athleteId, lines: [{ variantId: s.id, quantity: 2 }] });
    expect(res.success).toBe(true);
    const invoice = await db.invoice.findFirstOrThrow({ include: { lines: true } });
    expect(invoice.type).toBe("ITEM_PURCHASE");
    expect(Number(invoice.amountDue)).toBe(3000);
    expect(invoice.lines[0].description).toBe("Home jersey · S");

    expect((await cancelSale("SO-2026-0001", "Wrong size")).success).toBe(true);
    expect((await db.invoice.findFirstOrThrow()).status).toBe("CANCELED");
    expect(await stockOf(s.id)).toBe(3);
    expect((await cancelSale("SO-2026-0001", "Again")).success).toBe(false);
  });

  it("keeps a removed size with history, hidden", async () => {
    const { s, m } = await jersey();
    const product = await db.product.findFirstOrThrow();
    await saveProduct({ id: product.id, name: "Home jersey", category: "JERSEY", price: 1600, variants: [{ id: s.id, size: "S" }, { size: "L" }] });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: m.id } })).isArchived).toBe(true);
    expect(await db.productVariant.count({ where: { isArchived: false } })).toBe(2);
  });
});
