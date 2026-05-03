export type Period = "W" | "M" | "Y";
export type SortField = "createdAt" | "amountPaid" | "amountDue";
export type SortOrder = "asc" | "desc";

export type PaymentType =
  | "MPESA_SEND_MONEY"
  | "MPESA_PAYBILL"
  | "CASH"
  | "BANK_TRANSFER"
  | "CARD";

export type InvoiceStatus =
  | "PENDING"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "CANCELLED";

export type InvoiceType = "SUBSCRIPTION" | "ONE_TIME" | "LATE_FEE";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Transaction {
  id: string;
  notes: string | null;
  athleteId: string;
  invoiceId: string;
  amountPaid: number;
  collectedBy: string;
  paymentDate: string;
  paymentType: PaymentType;
  receiptNumber: string;
  athleteSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  athleteId: string;
  subscriptionPlanId: string;
  athleteSubscriptionId: string | null;
  type: InvoiceType;
  description: string;
  unitAmount: string; // Decimal as string
  quantity: number;
  amountDue: string; // Decimal as string
  discount: string | null; // Decimal as string
  amountPaid: string; // Decimal as string
  status: InvoiceStatus;
  dueDate: string;
  isRecurring: boolean;
  billingCycle: BillingCycle | null;
  periodStart: string;
  periodEnd: string | null;
  nextBillingDate: string | null;
  issuedBy: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  couponId: string | null;
}

export interface FinanceResponse {
  transactions: {
    data: Transaction[];
    meta: PaginationMeta;
  };
  dueInvoices: {
    data: Invoice[];
    meta: PaginationMeta;
  };
  summary: {
    totalDueAmount: string; // Decimal as string
    totalDueInvoices: number;
    period: string;
  };
}

export interface FinanceQueryParams {
  page?: number;
  limit?: number;
  period?: Period;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface ApiError {
  message: string;
  status?: number;
}

// Helper type for parsed amounts (convert string to number)
export interface ParsedFinanceSummary {
  totalDueAmount: number;
  totalDueInvoices: number;
  period: string;
}

export interface ParsedInvoice extends Omit<
  Invoice,
  "unitAmount" | "amountDue" | "discount" | "amountPaid"
> {
  unitAmount: number;
  amountDue: number;
  discount: number | null;
  amountPaid: number;
}
