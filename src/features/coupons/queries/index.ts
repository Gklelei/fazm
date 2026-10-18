// Active coupon as offered on the athlete profile (raw SQL row, normalized).
export type AthleteCouponOption = {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number; // UI-friendly
  interval: "ONCE" | "REPEATING";
  startDate: Date;
  expiryDate: Date | null;
  usageLimit: number | null;
  timesUsed: number;
  status: number;
  voided: number;
};
