import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeInvoice, makePlan, resetDb, signedIn } from "@/test/db";
import CreateAthleteInvoice from "./create-invoice";
import { setInvoiceCancelled } from "./cancel-invoice";

const base = {
  subScriptionName: "October fees",
  subScriptionAmount: "2500",
  subscriptionInterval: "MONTHLY" as const,
  startDate: "2026-11-01",
  dueDate: "2026-11-30",
  description: "November fees",
};

describe("creating invoices", () => {
  beforeEach(resetDb);

  it("bills each selected athlete the plan's amount, with sequential numbers", async () => {
    await signedIn("FINANCE");
    const plan = await makePlan(4000);
    const [a, b] = await Promise.all([makeAthlete(), makeAthlete()]);

    const res = await CreateAthleteInvoice({ ...base, athleteId: [a.athleteId, b.athleteId], subType: plan.id } as never);

    expect(res.success).toBe(true);
    const invoices = await db.invoice.findMany({ orderBy: { invoiceNumber: "asc" } });
    expect(invoices.map((i) => Number(i.amountDue))).toEqual([4000, 4000]);
    expect(invoices.map((i) => i.invoiceNumber.slice(-3))).toEqual(["001", "002"]);
    expect(invoices.every((i) => i.type === "SUBSCRIPTION" && i.status === "PENDING")).toBe(true);
  });

  it("uses the typed amount for a manual invoice", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();

    await CreateAthleteInvoice({ ...base, athleteId: [a.athleteId], subType: "MANUAL" } as never);

    const [inv] = await db.invoice.findMany();
    expect([inv.type, Number(inv.amountDue)]).toEqual(["MANUAL", 2500]);
  });

  it("creates nothing if one athlete doesn't exist", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();

    const res = await CreateAthleteInvoice({ ...base, athleteId: [a.athleteId, "NOPE"], subType: "MANUAL" } as never);

    expect(res.success).toBe(false);
    expect(await db.invoice.count()).toBe(0);
  });

  it("is refused for coaches", async () => {
    await signedIn("COACH");
    const a = await makeAthlete();
    expect((await CreateAthleteInvoice({ ...base, athleteId: [a.athleteId], subType: "MANUAL" } as never)).success).toBe(false);
  });
});

describe("cancelling and restoring an invoice", () => {
  beforeEach(resetDb);

  it("won't cancel a paid invoice", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 1000);
    await db.invoice.update({ where: { id: inv.id }, data: { amountPaid: 1000, status: "PAID" } });

    expect((await setInvoiceCancelled(inv.invoiceNumber, true)).success).toBe(false);
  });

  it("restores to the status its payments justify", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 1000);
    await db.invoice.update({ where: { id: inv.id }, data: { amountPaid: 400 } });

    await setInvoiceCancelled(inv.invoiceNumber, true);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("CANCELED");
    await setInvoiceCancelled(inv.invoiceNumber, false);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("PARTIAL");
  });
});
