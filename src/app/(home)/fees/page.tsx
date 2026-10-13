import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import { GetAllSubsQuery } from "@/features/finance/queries/plans";
import ViewSubscriptions from "@/features/finance/components/ViewSubscriptions";

export const metadata: Metadata = { title: "Fee plans" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = Math.min(50, Math.max(5, Number(sp.limit) || 10));

  const [plans, total] = await Promise.all([
    db.subscriptionPlan.findMany({
      ...GetAllSubsQuery,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.subscriptionPlan.count({ where: GetAllSubsQuery.where }),
  ]);

  return (
    <ViewSubscriptions
      data={plans.map((p) => ({ ...p, amount: Number(p.amount) }))}
      page={page}
      limit={limit}
      total={total}
    />
  );
}
