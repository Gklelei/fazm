import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeInvoice, makeProgramme, resetDb, signedIn } from "@/tests/support/db";
import { getReport } from "@/features/reports/queries/get-report";
import { parseRange } from "@/features/reports/lib/range";

const pay = (athleteId: string, invoiceId: string | null, amountPaid: number) =>
  db.finance.create({ data: { athleteId, invoiceId, amountPaid, collectedBy: "Office", paymentType: "CASH", receiptNumber: `R-${Math.random()}` } });

/** An athlete billed in Main, then moved to a Girls batch (as a transfer will). */
async function movedAthlete() {
  const main = await makeProgramme("Main");
  const girls = await makeProgramme("Girls");
  const [u13, girlsU13] = await Promise.all([makeBatch("U13", main.id), makeBatch("U13", girls.id)]);
  const a = await makeAthlete({ batchesId: u13.id });
  const old = await makeInvoice(a.athleteId, 5000);
  await db.athlete.update({ where: { id: a.id }, data: { batchesId: girlsU13.id } });
  return { main, girls, u13, girlsU13, a, old };
}

describe("money keeps the programme it was billed in", () => {
  beforeEach(resetDb);

  it("stamps invoices from the athlete's batch at the time", async () => {
    const { main, girls, u13, girlsU13, a, old } = await movedAthlete();
    expect(old).toMatchObject({ programmeId: main.id, batchId: u13.id });
    const fresh = await makeInvoice(a.athleteId, 3000);
    expect(fresh).toMatchObject({ programmeId: girls.id, batchId: girlsU13.id });
  });

  it("stamps a payment from its invoice, or the athlete's batch without one", async () => {
    const { main, girls, a, old } = await movedAthlete();
    expect(await pay(a.athleteId, old.id, 2000)).toMatchObject({ programmeId: main.id });
    expect(await pay(a.athleteId, null, 500)).toMatchObject({ programmeId: girls.id });
  });

  it("stamps a late fee like the overdue invoice", async () => {
    const { main, a, old } = await movedAthlete();
    const fee = await db.invoice.create({
      data: { invoiceNumber: "INV-LATE-1", athleteId: a.athleteId, type: "LATE_FEE", unitAmount: 200, amountDue: 200, dueDate: new Date(), lateFeeForId: old.id },
    });
    expect(fee.programmeId).toBe(main.id);
  });

  it("stamps a payment again when it moves to another invoice", async () => {
    const { main, girls, a, old } = await movedAthlete();
    const fresh = await makeInvoice(a.athleteId, 3000);
    const p = await pay(a.athleteId, old.id, 1000);
    expect(p.programmeId).toBe(main.id);
    const moved = await db.finance.update({ where: { id: p.id }, data: { invoiceId: fresh.id } });
    expect(moved.programmeId).toBe(girls.id);
    // Other edits leave the stamp alone
    expect((await db.finance.update({ where: { id: p.id }, data: { notes: "M-Pesa" } })).programmeId).toBe(girls.id);
  });

  it("reports past money under the old programme after a move", async () => {
    await signedIn("FINANCE");
    const { main, girls, a, old } = await movedAthlete();
    await pay(a.athleteId, old.id, 2000);
    await db.invoice.update({ where: { id: old.id }, data: { amountPaid: 2000, status: "PARTIAL" } });
    const range = parseRange({ range: "month" });

    expect((await getReport(range, new Date(), main.id)).money.fees).toBe(2000);
    expect((await getReport(range, new Date(), girls.id)).money.fees).toBe(0);
    const all = await getReport(range);
    expect(all.programmes.rows.find((r) => r.name === "Main")).toMatchObject({ fees: 2000, owed: 3000 });
    expect(all.programmes.rows.find((r) => r.name === "Girls")).toMatchObject({ fees: 0, owed: 0 });
  });
});
