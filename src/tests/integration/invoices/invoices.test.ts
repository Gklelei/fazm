import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeInvoice, makePlan, resetDb, signedIn } from "@/tests/support/db";
import { createInvoices, updateInvoice } from "@/features/invoices/actions/save-invoice";
import { setInvoiceCancelled } from "@/features/invoices/actions/cancel-invoice";
import { recipientsInBatches } from "@/features/invoices/lib/recipients";
import type { CreateInvoiceInput } from "@/features/invoices/schemas";

const base = (athletes: string[], over: Partial<CreateInvoiceInput> = {}): CreateInvoiceInput => ({
  athletes,
  type: "MANUAL",
  lines: [{ description: "November fees", quantity: 1, unitAmount: 2500 }],
  dueDate: "2026-11-30",
  notes: "",
  ...over,
});

describe("creating invoices", () => {
  beforeEach(resetDb);

  it("bills each selected athlete the same lines, with sequential numbers", async () => {
    await signedIn("FINANCE");
    const plan = await makePlan(4000);
    const [a, b] = await Promise.all([makeAthlete(), makeAthlete()]);

    const res = await createInvoices(
      base([a.athleteId, b.athleteId], { type: "SUBSCRIPTION", lines: [{ description: plan.name, quantity: 1, unitAmount: 4000, subscriptionPlanId: plan.id }] }),
    );

    expect(res.success).toBe(true);
    const invoices = await db.invoice.findMany({ orderBy: { invoiceNumber: "asc" }, include: { lines: true } });
    expect(invoices.map((i) => Number(i.amountDue))).toEqual([4000, 4000]);
    expect(invoices.map((i) => i.invoiceNumber.slice(-3))).toEqual(["001", "002"]);
    expect(invoices.every((i) => i.type === "SUBSCRIPTION" && i.status === "PENDING" && i.subscriptionPlanId === plan.id && i.lines.length === 1)).toBe(true);
  });

  it("totals several lines and keeps them in order", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    await createInvoices(
      base([a.athleteId], {
        lines: [
          { description: "Registration", quantity: 1, unitAmount: 1000 },
          { description: "Training socks", quantity: 2, unitAmount: 450.5 },
        ],
      }),
    );
    const inv = await db.invoice.findFirstOrThrow({ include: { lines: { orderBy: { position: "asc" } } } });
    expect(Number(inv.amountDue)).toBe(1901);
    expect(inv.lines.map((l) => [l.description, l.quantity, Number(l.amount)])).toEqual([
      ["Registration", 1, 1000],
      ["Training socks", 2, 901],
    ]);
    expect(inv.description).toBe("Registration, 2 × Training socks");
    // Due at the end of the day in Nairobi
    expect(inv.dueDate.toISOString()).toBe("2026-11-30T20:59:00.000Z");
  });

  it("creates nothing if one athlete doesn't exist", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const res = await createInvoices(base([a.athleteId, "NOPE"]));
    expect(res.success).toBe(false);
    expect(await db.invoice.count()).toBe(0);
  });

  it("is refused for coaches", async () => {
    await signedIn("COACH");
    const a = await makeAthlete();
    expect((await createInvoices(base([a.athleteId]))).success).toBe(false);
  });
});

describe("editing an invoice", () => {
  beforeEach(resetDb);

  async function partlyPaid() {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    await createInvoices(base([a.athleteId], { dueDate: "2099-01-31" }));
    const inv = await db.invoice.findFirstOrThrow();
    await db.invoice.update({ where: { id: inv.id }, data: { amountPaid: 1000, status: "PARTIAL" } });
    return inv;
  }

  it("replaces the lines, recalculates the status and logs the change", async () => {
    const inv = await partlyPaid();
    const res = await updateInvoice(inv.invoiceNumber, {
      type: "MANUAL",
      lines: [{ description: "November fees", quantity: 1, unitAmount: 1000 }],
      dueDate: "2099-01-31",
      notes: "",
    });
    expect(res.success).toBe(true);
    const after = await db.invoice.findUniqueOrThrow({ where: { id: inv.id }, include: { lines: true } });
    expect([Number(after.amountDue), after.status, after.lines.length]).toEqual([1000, "PAID", 1]);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "UPDATE_INVOICE" } });
    expect(log.changes).toMatchObject({ before: { total: 2500 }, after: { total: 1000 } });
  });

  it("won't go below what's been paid", async () => {
    const inv = await partlyPaid();
    const res = await updateInvoice(inv.invoiceNumber, {
      type: "MANUAL",
      lines: [{ description: "November fees", quantity: 1, unitAmount: 900 }],
      dueDate: "2099-01-31",
      notes: "",
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/^Payments already total/);
    expect(Number((await db.invoice.findUniqueOrThrow({ where: { id: inv.id } })).amountDue)).toBe(2500);
  });

  it("won't edit a cancelled invoice", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const inv = await makeInvoice(a.athleteId, 1000);
    await setInvoiceCancelled(inv.invoiceNumber, true);
    const res = await updateInvoice(inv.invoiceNumber, { type: "MANUAL", lines: [{ description: "x", quantity: 1, unitAmount: 5 }], dueDate: "2099-01-01", notes: "" });
    expect(res).toMatchObject({ success: false, message: "Restore the invoice before editing it." });
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

describe("billing whole batches", () => {
  beforeEach(resetDb);

  it("offers each billable athlete in the batch", async () => {
    const batch = await makeBatch("U13");
    await Promise.all([
      makeAthlete({ batchesId: batch.id }),
      makeAthlete({ batchesId: batch.id, status: "PENDING" }),
      makeAthlete({ batchesId: batch.id, status: "DEACTIVATED" }),
    ]);
    expect(await recipientsInBatches([batch.id])).toHaveLength(2);
  });

  it("bills each athlete once", async () => {
    await signedIn("FINANCE");
    const a = await makeAthlete();
    const res = await createInvoices(base([a.athleteId, a.athleteId]));
    expect(res).toMatchObject({ success: true, message: expect.stringMatching(/^Invoice /) });
    expect(await db.invoice.count()).toBe(1);
  });
});
