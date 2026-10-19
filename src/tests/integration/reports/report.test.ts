import { subYears } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, resetDb, signedIn } from "@/tests/support/db";
import { createSale, saveProduct } from "@/features/shop/actions/shop";
import { getReport } from "@/features/reports/queries/get-report";
import { parseRange } from "@/features/reports/lib/range";
import { drillRecords } from "@/features/reports/queries/records";

const pay = (athleteId: string, invoiceId: string, amountPaid: number, paymentDate: Date) =>
  db.finance.create({ data: { athleteId, invoiceId, amountPaid, paymentDate, collectedBy: "Office", paymentType: "CASH", receiptNumber: `R-${Math.random()}` } });

describe("reports", () => {
  beforeEach(resetDb);

  it("splits income into fees and shop, compares with last year, and the records add up", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const fee = await makeInvoice(a.athleteId, 5000);
    await pay(a.athleteId, fee.id, 3000, new Date());
    await pay(a.athleteId, fee.id, 1000, subYears(new Date(), 1));
    await saveProduct({ name: "Socks", category: "SOCKS", price: 400, variants: [{ size: "", opening: 10 }] });
    const variant = await db.productVariant.findFirstOrThrow();
    await createSale({ payment: "CASH", lines: [{ variantId: variant.id, quantity: 2 }] });
    await createSale({ payment: "ACCOUNT", athleteId: a.athleteId, lines: [{ variantId: variant.id, quantity: 1 }] });
    const shopInvoice = await db.invoice.findFirstOrThrow({ where: { type: "ITEM_PURCHASE" } });
    await pay(a.athleteId, shopInvoice.id, 400, new Date());

    const range = parseRange({ range: "month" });
    const { money } = await getReport(range);
    expect(money.fees).toBe(3000);
    expect(money.shop).toBe(1200);
    expect(money.collected).toBe(4200);
    expect(money.lastYear).toBe(1000);

    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const q = { from: ymd(range.from), to: ymd(new Date()) };
    expect((await drillRecords({ series: "fees", ...q })).total).toBe(3000);
    expect((await drillRecords({ series: "shop", ...q })).total).toBe(1200);
    expect((await drillRecords({ series: "income", ...q })).rows).toHaveLength(3);
  });
});
