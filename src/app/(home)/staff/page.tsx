import { db } from "@/lib/prisma";
import { GetStaffQuery } from "@/features/staff/queries";
import ViewAllStaff from "@/features/staff/components/ViewAllStaff";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff & Coaches" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [staff, total] = await db.$transaction([
    db.staff.findMany({
      ...GetStaffQuery,
      orderBy: { createAt: "desc" },
      skip,
      take: limit,
    }),
    db.staff.count(),
  ]);

  return <ViewAllStaff data={staff} page={page} limit={limit} total={total} />;
}
