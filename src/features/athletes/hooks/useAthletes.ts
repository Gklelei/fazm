"use client";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { AthleteFilters } from "@/features/athletes/queries/filters";
import type { AthletesPage } from "@/features/athletes/queries/list";

export type AthletesInfiniteData = InfiniteData<AthletesPage, string>;

/** Query string for /api/athlete/athletes-all and /api/export (empty keys dropped). */
export function athleteFilterParams(filters: AthleteFilters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  return params;
}

export const useAthletes = ({
  filters,
  initialData,
}: {
  filters: AthleteFilters;
  initialData?: AthletesInfiniteData;
}) => {
  const hasFilters = Object.values(filters).some(Boolean);

  return useInfiniteQuery({
    // The server-rendered first page is only valid while nothing is filtered
    initialData: hasFilters ? undefined : initialData,
    queryKey: ["all-athletes", filters],
    queryFn: async ({ pageParam }): Promise<AthletesPage> => {
      const params = athleteFilterParams(filters);
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`/api/athlete/athletes-all?${params}`);
      if (!res.ok) throw new Error("Couldn't load athletes");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
};
