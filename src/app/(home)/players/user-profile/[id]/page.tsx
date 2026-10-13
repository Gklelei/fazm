import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import AthleteProfile from "@/features/athletes/components/profile/AthleteProfile";
import { GetAthleteByIdQuery } from "@/features/athletes/queries";
import { getAthleteSummary } from "@/features/athletes/queries/summary";
import type { AthleteCouponOption } from "@/features/coupons/queries";

export const metadata: Metadata = { title: "Athlete" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [athlete, summary, coupons] = await Promise.all([
    db.athlete.findUnique(GetAthleteByIdQuery(id)),
    getAthleteSummary(id),
    // Coupons that can still be applied to this athlete's plan
    db.coupon.findMany({
      where: {
        voided: 0,
        status: 1,
        OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
        AND: [
          {
            OR: [
              { usageLimit: null },
              { timesUsed: { lt: db.coupon.fields.usageLimit } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!athlete || athlete.isArchived) notFound();

  const options: AthleteCouponOption[] = coupons.map((c) => ({
    id: c.id,
    name: c.name,
    discountType: c.discountType,
    value: Number(c.value),
    interval: c.interval,
    startDate: c.startDate,
    expiryDate: c.expiryDate,
    usageLimit: c.usageLimit,
    timesUsed: c.timesUsed,
    status: c.status,
    voided: c.voided,
  }));

  // Prisma Decimals can't cross into client components; JSON turns them
  // into strings, which the profile's money helpers already Number().
  const plain = JSON.parse(JSON.stringify(athlete)) as typeof athlete;

  return <AthleteProfile data={plain} coupons={options} summary={summary} />;
}
