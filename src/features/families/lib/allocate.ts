/** Splits a family payment across open invoices, oldest due first, never more than each balance. Works in cents. */
export function allocateOldestFirst(amount: number, invoices: { invoiceNumber: string; balance: number }[]) {
  let left = Math.round(amount * 100);
  const out: Record<string, number> = {};
  for (const i of invoices) {
    const take = Math.min(left, Math.round(i.balance * 100));
    out[i.invoiceNumber] = take / 100;
    left -= take;
  }
  return { split: out, unallocated: left / 100 };
}
