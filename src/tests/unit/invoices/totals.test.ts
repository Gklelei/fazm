import { describe, expect, it } from "vitest";
import { createInvoiceSchema, invoiceTotal, lineTotal } from "@/features/invoices/schemas";

describe("invoice totals", () => {
  it("multiplies and adds without floating-point drift", () => {
    expect(lineTotal({ quantity: 3, unitAmount: 0.1 })).toBe(0.3);
    expect(invoiceTotal([{ quantity: 1, unitAmount: 3000 }, { quantity: 2, unitAmount: 1250.5 }])).toBe(5501);
  });
});

describe("invoice form", () => {
  const ok = { athletes: ["ATH-1"], type: "MANUAL", lines: [{ description: "Kit", quantity: "2", unitAmount: "1250.50" }], dueDate: "2026-11-30", notes: "" };
  it("reads typed numbers", () => {
    expect(createInvoiceSchema.parse(ok).lines[0]).toMatchObject({ quantity: 2, unitAmount: 1250.5 });
  });
  it.each([
    [{ lines: [] }, "Add at least one line"],
    [{ lines: [{ description: "Kit", quantity: "1", unitAmount: "0" }] }, "Enter an amount above 0"],
    [{ lines: [{ description: "Kit", quantity: "1", unitAmount: "10.555" }] }, "Use at most 2 decimal places"],
    [{ lines: [{ description: "", quantity: "1", unitAmount: "10" }] }, "Describe the charge"],
    [{ athletes: [] }, "Choose who to bill"],
  ])("refuses %j", (over, message) => {
    const r = createInvoiceSchema.safeParse({ ...ok, ...over });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(message);
  });
});
