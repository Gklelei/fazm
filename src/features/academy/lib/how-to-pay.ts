/** Where parents send money: the main method, the account reference to use, and an optional bank. */
export type PaymentDetails = {
  paymentMethodType?: string | null;
  paymentMathod?: string | null;
  paymentReference?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
};

export const PAYMENT_REFERENCES = [
  { value: "ATHLETE_ID", label: "The athlete's ID" },
  { value: "INVOICE_NUMBER", label: "The invoice number" },
] as const;

/**
 * The instructions as label/value rows, e.g.
 * "M-Pesa Paybill" "123456", "Account number" "ATH-FFA-501", "Bank" "KCB · Fazam Academy · 1234567890 · Eastleigh".
 */
export function howToPay(a: PaymentDetails | null | undefined, ref: { athleteId?: string; invoiceNumber?: string } = {}) {
  if (!a) return [];
  const rows: { label: string; value: string }[] = [];
  if (a.paymentMethodType || a.paymentMathod) rows.push({ label: a.paymentMethodType || "Pay to", value: a.paymentMathod ?? "" });
  const account = a.paymentReference === "ATHLETE_ID" ? ref.athleteId : a.paymentReference === "INVOICE_NUMBER" ? ref.invoiceNumber : undefined;
  if (account) rows.push({ label: "Account number", value: account });
  const bank = [a.bankName, a.bankAccountName, a.bankAccountNumber, a.bankBranch].filter(Boolean).join(" · ");
  if (a.bankAccountNumber) rows.push({ label: "Bank", value: bank });
  return rows;
}
