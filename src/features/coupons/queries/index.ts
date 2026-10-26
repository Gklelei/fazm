/** A coupon that can be given now, as offered on the athlete profile. */
export type AthleteCouponOption = {
  id: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  duration: "ONCE" | "INVOICES" | "ALWAYS";
  durationCount: number | null;
  /** Only these fee plans' charges (names); empty: any charge */
  plans: string[];
};
