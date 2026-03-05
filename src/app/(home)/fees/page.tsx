import { db } from "@/lib/prisma";
import { GetAllSubsQuery } from "@/Modules/Finances/Type/Subs";
import ViewSubscriptions from "@/Modules/Finances/Ui/ViewSubscriptions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [allSubsResponse, total] = await db.$transaction([
    db.subscriptionPlan.findMany({
      ...(GetAllSubsQuery as any),
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.subscriptionPlan.count(),
  ]);

  const allSubs = allSubsResponse as any;

  return (
    <ViewSubscriptions data={allSubs} page={page} limit={limit} total={total} />
  );
}
