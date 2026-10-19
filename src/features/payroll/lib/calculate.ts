/**
 * Works out one payslip. Pure, in cents, so it can be tested and re-run.
 *
 * Order: gross (basic + allowances) → deductions taken before tax → banded tax
 * (PAYE) on what's left, less relief → other deductions → one-off deductions →
 * advance recoveries, oldest first, never more than what's left to pay.
 */
export type DeductionKind = "PERCENT_GROSS" | "PERCENT_BASIC" | "FIXED" | "BANDED";
export type Band = { upTo: number | null; rate: number };
export type DeductionRule = {
  name: string;
  kind: DeductionKind;
  value: number;
  bands?: Band[] | null;
  relief?: number;
  minimum?: number | null;
  maximum?: number | null;
  beforeTax?: boolean;
  employerPercent?: number;
};
export type Item = { name: string; amount: number };
export type AdvanceDue = { id: string; outstanding: number; installment: number };
export type LineKind = "BASIC" | "ALLOWANCE" | "DEDUCTION" | "TAX" | "ONE_OFF" | "ADVANCE" | "EMPLOYER";
export type Line = { kind: LineKind; name: string; amount: number };

export type PayslipInput = {
  basic: number;
  basicLabel?: string;
  allowances?: Item[];
  deductions?: DeductionRule[];
  oneOffs?: Item[];
  advances?: AdvanceDue[];
  /** Advance to take back this month instead of the installments due (the admin's choice) */
  advanceOverride?: number | null;
};

const c = (kes: number) => Math.round(kes * 100);
const kes = (cents: number) => cents / 100;

/** Tax on `base` (cents) through the bands, before relief. */
export function bandedTax(baseCents: number, bands: Band[]): number {
  let tax = 0;
  let from = 0;
  for (const b of bands) {
    const to = b.upTo == null ? Infinity : c(b.upTo);
    if (baseCents <= from) break;
    tax += ((Math.min(baseCents, to) - from) * b.rate) / 100;
    from = to;
  }
  return Math.round(tax);
}

function amountOf(d: DeductionRule, grossCents: number, basicCents: number): number {
  let a = d.kind === "FIXED" ? c(d.value) : Math.round(((d.kind === "PERCENT_BASIC" ? basicCents : grossCents) * d.value) / 100);
  if (d.minimum != null) a = Math.max(a, c(d.minimum));
  if (d.maximum != null) a = Math.min(a, c(d.maximum));
  return a;
}

export function calculatePayslip(input: PayslipInput) {
  const basic = c(input.basic);
  const allowances = (input.allowances ?? []).filter((a) => a.amount > 0);
  const gross = basic + allowances.reduce((s, a) => s + c(a.amount), 0);
  const lines: Line[] = [{ kind: "BASIC", name: input.basicLabel ?? "Basic pay", amount: kes(basic) }, ...allowances.map((a) => ({ kind: "ALLOWANCE" as const, name: a.name, amount: a.amount }))];
  if (gross === 0) return { gross: 0, deductions: 0, net: 0, employer: 0, lines, recoveries: [] as { advanceId: string; amount: number }[], overCap: false, maxAdvance: 0 };

  const rules = input.deductions ?? [];
  let taken = 0;
  let employer = 0;
  const employerLines: Line[] = [];
  const take = (kind: LineKind, name: string, cents: number) => {
    if (cents <= 0) return;
    taken += cents;
    lines.push({ kind, name, amount: kes(cents) });
  };
  const flat = (d: DeductionRule) => {
    const a = amountOf(d, gross, basic);
    take("DEDUCTION", d.name, a);
    const e = Math.round((a * (d.employerPercent ?? 0)) / 100);
    if (e > 0) {
      employer += e;
      employerLines.push({ kind: "EMPLOYER", name: `${d.name} (employer)`, amount: kes(e) });
    }
  };

  rules.filter((d) => d.kind !== "BANDED" && d.beforeTax).forEach(flat);
  for (const d of rules.filter((d) => d.kind === "BANDED")) {
    take("TAX", d.name, Math.max(0, bandedTax(gross - taken, d.bands ?? []) - c(d.relief ?? 0)));
  }
  rules.filter((d) => d.kind !== "BANDED" && !d.beforeTax).forEach(flat);
  for (const o of input.oneOffs ?? []) take("ONE_OFF", o.name, c(o.amount));

  // Employment Act s.19(3): deductions stop at two-thirds of pay
  const cap = Math.floor((gross * 2) / 3);
  const maxAdvance = Math.max(0, cap - taken);
  const due = input.advanceOverride != null ? c(input.advanceOverride) : (input.advances ?? []).reduce((s, a) => s + Math.min(c(a.installment), c(a.outstanding)), 0);
  let left = Math.min(due, gross - taken);
  const recoveries: { advanceId: string; amount: number }[] = [];
  for (const a of input.advances ?? []) {
    if (left <= 0) break;
    const r = Math.min(left, c(a.outstanding));
    if (r > 0) recoveries.push({ advanceId: a.id, amount: kes(r) });
    left -= r;
  }
  take("ADVANCE", "Salary advance", recoveries.reduce((s, r) => s + c(r.amount), 0));

  return {
    gross: kes(gross),
    deductions: kes(taken),
    net: kes(gross - taken),
    employer: kes(employer),
    lines: [...lines, ...employerLines],
    recoveries,
    overCap: taken > cap,
    /** The most advance that keeps deductions within two-thirds */
    maxAdvance: kes(maxAdvance),
  };
}

/** One month's installment of an advance: an equal share, or what's left. */
export const installmentOf = (amount: number, months: number, outstanding: number) =>
  Math.min(outstanding, Math.ceil((amount * 100) / Math.max(1, months)) / 100);
