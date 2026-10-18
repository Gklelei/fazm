import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { familyOf } from "@/features/families/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasRole } from "@/lib/roles";
import AthleteProfile from "@/features/athletes/components/profile/AthleteProfile";
import { GetAthleteByIdQuery } from "@/features/athletes/queries";
import { getAthleteSummary } from "@/features/athletes/queries/summary";
import type { AthleteCouponOption } from "@/features/coupons/queries";
import { athleteProgress } from "@/features/assessments/queries/progress";
import { logView } from "@/lib/audit-view";

export const metadata: Metadata = { title: "Athlete" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [athlete, summary, progress, coupons] = await Promise.all([
    db.athlete.findUnique(GetAthleteByIdQuery(id)),
    getAthleteSummary(id),
    athleteProgress(id),
    // Repeating coupons that can still go on this athlete's fee plan
    db.coupon.findMany({
      where: {
        interval: "REPEATING",
        startDate: { lte: new Date() },
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
  await logView({
    resource: "Athlete",
    recordId: athlete.athleteId,
    athleteId: athlete.id,
    details: `Opened ${athlete.firstName} ${athlete.lastName}'s profile (${athlete.athleteId})`,
  });

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

  const [session, family] = await Promise.all([auth.api.getSession({ headers: await headers() }), familyOf(athlete.athleteId)]);
  // Finance officers see the money only: nothing medical or personal reaches their browser
  const moneyOnly = !hasRole(session?.user.role, "athletes");
  const shared = moneyOnly
    ? {
        ...athlete,
        medical: null,
        emergencyContacts: [],
        address: null,
        consents: [],
        assessments: [],
        birthCertificate: null,
        nationalIdFront: null,
        nationalIdBack: null,
        passportCover: null,
        passportBioData: null,
        profilePIcture: null,
      }
    : athlete;
  // Prisma Decimals can't cross into client components; JSON turns them
  // into strings, which the profile's money helpers already Number().
  const plain = JSON.parse(JSON.stringify(shared)) as typeof athlete;

  return (
    <AthleteProfile
      data={plain}
      coupons={options}
      summary={summary}
      canManageConsent={hasRole(session?.user.role, "admin")}
      canSendStatement={hasRole(session?.user.role, "finance")}
      family={family}
      moneyOnly={moneyOnly}
      progress={moneyOnly ? { ...progress, sections: [], assessments: [] } : progress}
    />
  );
}
