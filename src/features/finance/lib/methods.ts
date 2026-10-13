import type { PAYMENT_TYPE } from "@/generated/prisma/enums";

/** How a payment was made, in the words people use at the till. */
export const METHOD_LABEL: Record<PAYMENT_TYPE, string> = {
  MPESA_PAYBILL: "M-Pesa paybill",
  MPESA_SEND_MONEY: "M-Pesa send money",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
};
