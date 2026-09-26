import type { Metadata } from "next";
import StatsPage from "@/Modules/analytics/ui/StatsPage";

export const metadata: Metadata = { title: "Statistics" };

export default function Page() {
  return <StatsPage />;
}
