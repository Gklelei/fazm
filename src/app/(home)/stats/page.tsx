import type { Metadata } from "next";
import StatsPage from "@/features/analytics/components/StatsPage";

export const metadata: Metadata = { title: "Statistics" };

export default function Page() {
  return <StatsPage />;
}
