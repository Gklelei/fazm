import NotFound from "@/app/not-found";
import { db } from "@/lib/prisma";
import AthleteProfile from "@/Modules/Users/AthletesProfile/AthleteProfile";
import { GetAthleteByIdQuery } from "@/Modules/Users/Types";

type CouponRow = {
  id: string;
  name: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: string | number; // Decimal often comes back as string
  interval: "ONCE" | "REPEATING";
  start_date: Date;
  expiry_date: Date | null;
  usage_limit: number | null;
  times_used: number;
  status: number; // 0 | 1
  voided: number; // 0 | 1
};

export type GetCouponsQueryType = {
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

interface PageProps {
  params: Promise<{ id: string }>;
}

const page = async ({ params }: PageProps) => {
  const { id } = await params;

  const athlete = await db.athlete.findUnique(GetAthleteByIdQuery(id));
  if (!athlete) return <NotFound />;

  const activeCoupons = await db.$queryRaw<CouponRow[]>`
    SELECT *
    FROM coupons
    WHERE
      voided = 0
      AND status = 1
      AND (expiry_date IS NULL OR expiry_date > NOW())
      AND (
        usage_limit IS NULL
        OR times_used < usage_limit
      )
    ORDER BY created_at DESC
  `;

  const normalized: GetCouponsQueryType[] = activeCoupons.map((c) => ({
    id: c.id,
    name: c.name,
    discountType: c.discount_type,
    value: Number(c.value),
    interval: c.interval,
    startDate: c.start_date,
    expiryDate: c.expiry_date,
    usageLimit: c.usage_limit,
    timesUsed: c.times_used,
    status: c.status,
    voided: c.voided,
  }));

  return <AthleteProfile data={athlete} coupons={normalized} />;
};

export default page;
