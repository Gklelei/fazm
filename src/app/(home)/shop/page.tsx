import type { Metadata } from "next";
import { academyInstant, academyToday } from "@/lib/academy-time";
import { catalogue, listMovements, listSales, salesSummary } from "@/features/shop/queries";
import { ShopPage } from "@/features/shop/components/ShopPage";

export const metadata: Metadata = { title: "Shop" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; archived?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "sales" || sp.tab === "stock" ? sp.tab : "catalogue";
  const [products, archived, sales, summary, movements] = await Promise.all([
    catalogue(),
    sp.archived === "1" ? catalogue(true) : null,
    listSales({}),
    salesSummary(academyInstant(`${academyToday().slice(0, 7)}-01`, "00:00")),
    listMovements(),
  ]);
  return <ShopPage tab={tab} catalogue={products} archived={archived} sales={sales} summary={summary} movements={movements} />;
}
