import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, resetDb, signedIn } from "@/tests/support/db";
import { linkSiblings } from "@/features/families/actions/link";
import { payFamily } from "@/features/families/actions/pay";

const base = { paymentDate: "2026-10-18", paymentType: "MPESA_PAYBILL" as const, collectedBy: "Front office" };

async function family() {
  await signedIn("FINANCE");
  const [a, b, outsider] = await Promise.all([makeAthlete(), makeAthlete(), makeAthlete()]);
  await linkSiblings(a.athleteId, b.athleteId);
  const [ia, ib, io] = await Promise.all([makeInvoice(a.athleteId, 3000), makeInvoice(b.athleteId, 2000), makeInvoice(outsider.athleteId, 1000)]);
  return { a, ia, ib, io };
}

describe("family payments", () => {
  beforeEach(resetDb);

  it("records one receipt per invoice, all together", async () => {
    const { a, ia, ib } = await family();
    const res = await payFamily({ ...base, athleteId: a.athleteId, lines: [{ invoiceNumber: ia.invoiceNumber, amount: 3000 }, { invoiceNumber: ib.invoiceNumber, amount: 500 }] });

    expect(res.success).toBe(true);
    expect(await db.finance.count()).toBe(2);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: ia.id } })).status).toBe("PAID");
    expect(Number((await db.invoice.findUniqueOrThrow({ where: { id: ib.id } })).amountPaid)).toBe(500);
  });

  it("saves nothing when one part is more than its balance", async () => {
    const { a, ia, ib } = await family();
    const res = await payFamily({ ...base, athleteId: a.athleteId, lines: [{ invoiceNumber: ia.invoiceNumber, amount: 3000 }, { invoiceNumber: ib.invoiceNumber, amount: 2500 }] });

    expect(res.success).toBe(false);
    expect(await db.finance.count()).toBe(0);
    expect(Number((await db.invoice.findUniqueOrThrow({ where: { id: ia.id } })).amountPaid)).toBe(0);
  });

  it("refuses invoices from outside the family", async () => {
    const { a, io } = await family();
    const res = await payFamily({ ...base, athleteId: a.athleteId, lines: [{ invoiceNumber: io.invoiceNumber, amount: 1000 }] });
    expect(res.success).toBe(false);
    expect(await db.finance.count()).toBe(0);
  });
});
