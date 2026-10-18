import { describe, expect, it } from "vitest";
import { howToPay } from "@/features/academy/lib/how-to-pay";

describe("payment instructions", () => {
  const paybill = { paymentMethodType: "M-Pesa Paybill", paymentMathod: "123456" };

  it("asks for the athlete ID or invoice number as the account", () => {
    expect(howToPay({ ...paybill, paymentReference: "ATHLETE_ID" }, { athleteId: "ATH-FFA-501", invoiceNumber: "INV-1" })).toEqual([
      { label: "M-Pesa Paybill", value: "123456" },
      { label: "Account number", value: "ATH-FFA-501" },
    ]);
    expect(howToPay({ ...paybill, paymentReference: "INVOICE_NUMBER" }, { invoiceNumber: "INV-1" })[1]).toEqual({ label: "Account number", value: "INV-1" });
    expect(howToPay(paybill, { athleteId: "ATH-FFA-501" })).toHaveLength(1);
  });

  it("adds the bank only when there's an account number", () => {
    expect(howToPay({ ...paybill, bankName: "KCB" })).toHaveLength(1);
    expect(howToPay({ ...paybill, bankName: "KCB", bankAccountName: "Fazam", bankAccountNumber: "1234567890" })[1]).toEqual({ label: "Bank", value: "KCB · Fazam · 1234567890" });
    expect(howToPay(null)).toEqual([]);
  });
});
