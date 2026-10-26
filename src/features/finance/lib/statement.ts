import { academyDate } from "@/lib/academy-time";

/**
 * An athlete's statement: charges (invoices), discounts and payments by
 * Nairobi day, with a running balance. Cancelled invoices and removed
 * payments don't count. With a period, everything before it is the opening
 * balance. Used by the statement tab, its PDF and its email.
 */
export type StatementInvoice = {
  id: string;
  invoiceNumber: string;
  createdAt: Date | string;
  description: string | null;
  amountDue: unknown;
  discount: unknown;
  status: string;
  /** Each discount on the invoice, as it reads */
  discounts?: { id: string; label: string; amount: unknown }[];
};
export type StatementPayment = {
  id: string;
  receiptNumber: string;
  paymentDate: Date | string;
  amountPaid: unknown;
  paymentType: string;
  notes: string | null;
  isArchived?: boolean;
};
export type StatementLine = {
  key: string;
  /** YYYY-MM-DD in Nairobi */
  day: string;
  description: string;
  reference: string;
  kind: "CHARGE" | "DISCOUNT" | "PAYMENT";
  /** What it adds to the balance (charges) */
  charge: number;
  /** What it takes off (discounts, payments) */
  credit: number;
  balance: number;
};

const ORDER = { CHARGE: 0, DISCOUNT: 1, PAYMENT: 2 } as const;
const paymentLabel = (t: string) => (t.charAt(0) + t.slice(1).toLowerCase().replaceAll("_", " ")).replace("Mpesa", "M-Pesa");

export function buildStatement({
  invoices,
  payments,
  from,
  to,
}: {
  invoices: StatementInvoice[];
  payments: StatementPayment[];
  /** YYYY-MM-DD, inclusive; empty for all time */
  from?: string;
  to?: string;
}) {
  const all: Omit<StatementLine, "balance">[] = [];
  for (const inv of invoices) {
    if (inv.status === "CANCELED") continue;
    const day = academyDate(new Date(inv.createdAt));
    all.push({ key: `inv-${inv.id}`, day, description: inv.description || "Invoice", reference: inv.invoiceNumber, kind: "CHARGE", charge: Number(inv.amountDue), credit: 0 });
    const off = Number(inv.discount ?? 0);
    const rows = (inv.discounts ?? []).filter((d) => Number(d.amount) > 0);
    if (rows.length) {
      // One line per discount; together never more than the invoice's discount
      let left = off;
      for (const d of rows) {
        const credit = Math.min(Number(d.amount), left);
        left -= credit;
        if (credit > 0) all.push({ key: `disc-${d.id}`, day, description: `Discount: ${d.label}`, reference: inv.invoiceNumber, kind: "DISCOUNT", charge: 0, credit });
      }
    } else if (off > 0) {
      all.push({ key: `disc-${inv.id}`, day, description: "Discount", reference: inv.invoiceNumber, kind: "DISCOUNT", charge: 0, credit: off });
    }
  }
  for (const p of payments) {
    if (p.isArchived) continue;
    all.push({
      key: `pay-${p.id}`,
      day: academyDate(new Date(p.paymentDate)),
      description: p.notes || `Payment · ${paymentLabel(p.paymentType)}`,
      reference: p.receiptNumber,
      kind: "PAYMENT",
      charge: 0,
      credit: Number(p.amountPaid),
    });
  }
  all.sort((a, b) => a.day.localeCompare(b.day) || ORDER[a.kind] - ORDER[b.kind] || a.reference.localeCompare(b.reference));

  const before = from ? all.filter((l) => l.day < from) : [];
  const inPeriod = all.filter((l) => (!from || l.day >= from) && (!to || l.day <= to));
  const opening = before.reduce((b, l) => b + l.charge - l.credit, 0);
  let balance = opening;
  const lines: StatementLine[] = inPeriod.map((l) => ({ ...l, balance: (balance += l.charge - l.credit) }));
  return {
    opening,
    lines,
    charges: lines.reduce((s, l) => s + l.charge, 0),
    credits: lines.reduce((s, l) => s + l.credit, 0),
    closing: balance,
  };
}

export type Statement = ReturnType<typeof buildStatement>;
