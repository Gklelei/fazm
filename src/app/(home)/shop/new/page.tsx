import type { Metadata } from "next";
import { db } from "@/lib/prisma";
import { athleteName } from "@/features/athletes/lib/names";
import { catalogue } from "@/features/shop/queries";
import { NewSale } from "@/features/shop/components/NewSale";

export const metadata: Metadata = { title: "New sale" };

/** ?athlete=ATH-… starts the sale for that athlete (from their profile). */
export default async function Page({ searchParams }: { searchParams: Promise<{ athlete?: string }> }) {
  const { athlete: id } = await searchParams;
  const [data, a] = await Promise.all([
    catalogue(),
    id ? db.athlete.findUnique({ where: { athleteId: id }, select: { athleteId: true, firstName: true, middleName: true, lastName: true } }) : null,
  ]);
  return <NewSale catalogue={data} athlete={a ? { athleteId: a.athleteId, name: athleteName(a) } : null} />;
}
