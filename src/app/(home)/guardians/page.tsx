import { db } from "@/lib/prisma";
import {
  buildGuardianWhere,
  guardianFiltersFromParams,
  GuardiansQuery,
} from "@/features/guardians/queries";
import ViewAllGuardins from "@/features/guardians/components/GuardiansTable";
import { selectedProgrammeId } from "@/lib/programme";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guardians" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = Math.min(50, Math.max(5, Number(sp.limit) || 10));

  // Filtered on the server so the count and pages match what's shown
  const where = buildGuardianWhere({
    ...guardianFiltersFromParams((k) => sp[k]),
    programmeId: await selectedProgrammeId(),
  });
  const [guardians, total] = await db.$transaction([
    db.athleteGuardian.findMany({
      ...GuardiansQuery,
      where,
      orderBy: [{ fullNames: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.athleteGuardian.count({ where }),
  ]);

  return <ViewAllGuardins data={guardians} noOfGuarddians={total} page={page} limit={limit} />;
}
