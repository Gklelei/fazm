import { db } from "@/lib/prisma";
import {
  GuardiansQuery,
  GuardiansResponseType,
} from "@/features/guardians/queries";
import ViewAllGuardins from "@/features/guardians/components/GuardiansTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guardians" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const unresolvedSearchParams = await searchParams;
  const page = parseInt((unresolvedSearchParams.page as string) || "1", 10);
  const limit = parseInt((unresolvedSearchParams.limit as string) || "10", 10);
  const skip = (page - 1) * limit;

  const [guardiansResponse, guardinsCount] = await db.$transaction([
    db.athleteGuardian.findMany({
      ...GuardiansQuery,
      skip,
      take: limit,
    }),
    db.athleteGuardian.count(),
  ]);

  const guardians = guardiansResponse as GuardiansResponseType[];

  return (
    <div>
      <ViewAllGuardins
        data={guardians}
        noOfGuarddians={guardinsCount}
        page={page}
        limit={limit}
      />
    </div>
  );
}
