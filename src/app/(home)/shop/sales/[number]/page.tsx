import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { saleByNumber } from "@/features/shop/queries";
import { SaleView } from "@/features/shop/components/SaleView";

export const metadata: Metadata = { title: "Sale" };

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const sale = await saleByNumber((await params).number);
  if (!sale) notFound();
  return <SaleView sale={sale} />;
}
