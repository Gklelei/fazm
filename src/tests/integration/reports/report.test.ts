import { subYears } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeInvoice, makeProgramme, resetDb, signedIn } from "@/tests/support/db";
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

  it("narrows to one programme and names repeated batches by programme", async () => {
    await signedIn("FINANCE");
    const boys = await makeProgramme("Boys");
    const girls = await makeProgramme("Girls");
    const boy = await makeAthlete({ batchesId: (await makeBatch("U13", boys.id)).id });
    const girl = await makeAthlete({ batchesId: (await makeBatch("U13", girls.id)).id });
    await pay(boy.athleteId, (await makeInvoice(boy.athleteId, 5000)).id, 2000, new Date());
    await pay(girl.athleteId, (await makeInvoice(girl.athleteId, 5000)).id, 3000, new Date());
    const kit = await db.expenseCategories.create({ data: { name: "Kit", status: "ACTIVE" } });
    await db.expenses.create({ data: { name: "Girls kit", amount: 700, date: new Date(), programmeId: girls.id, categoryId: kit.id } });

    const range = parseRange({ range: "month" });
    const all = await getReport(range);
    expect(all.money.fees).toBe(5000);
    // Same name in two programmes: not added together
    expect(all.money.byBatch.map((b) => b.name).sort()).toEqual(["Boys U13", "Girls U13"]);

    await db.expenses.create({ data: { name: "Pitch hire", amount: 1000, date: new Date(), categoryId: kit.id } });
    const all2 = await getReport(range);
    expect(all2.programmes.rows.map((r) => [r.name, r.fees, r.spent])).toEqual([
      ["Boys", 2000, 0],
      ["Girls", 3000, 700],
    ]);
    expect(all2.programmes.shared).toBe(1000);

    const g = await getReport(range, new Date(), girls.id);
    // Shared costs are shown apart, never in a programme's own spending
    expect(g.money.sharedSpent).toBe(1000);
    expect(g.programmes.rows).toEqual([]);
    expect(g.money.fees).toBe(3000);
    expect(g.money.spent).toBe(700);
    // Only her invoice (the helper above records payments without touching invoices)
    expect(g.unpaid.total).toBe(5000);
    expect(all.unpaid.total).toBe(10000);
    expect((await getReport(range, new Date(), boys.id)).money.spent).toBe(0);

    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const q = { from: ymd(range.from), to: ymd(new Date()) };
    expect((await drillRecords({ series: "fees", ...q, batch: "Girls U13" })).total).toBe(3000);
    expect((await drillRecords({ series: "fees", ...q }, boys.id)).total).toBe(2000);
  });
});
