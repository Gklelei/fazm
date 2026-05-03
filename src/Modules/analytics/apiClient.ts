import { useQuery } from "@tanstack/react-query";

export function UseAnalyticsData() {
  return useQuery({
    queryKey: ["ANALYTICS-DATA"],
    queryFn: async () => {
      const res = await fetch("/api/stats", {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("An Error occured");
      }
      return await res.json();
    },
  });
}
