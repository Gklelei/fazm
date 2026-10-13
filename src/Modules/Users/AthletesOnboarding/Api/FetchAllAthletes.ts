"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Prisma } from "@/generated/prisma/client";
import type { AthleteFilters } from "./athleteFilters";

// Matches the shape returned by GET /api/athlete/athletes-all
// (db.athlete.findMany({ include: { address: true, medical: true } })).
type AthleteListItem = Prisma.AthleteGetPayload<{
  include: { address: true; medical: true };
}>;

export type AthletesPage = {
  allAthletes: AthleteListItem[];
  nextCursor: string | null;
  pageSize: number;
};

export type AthletesInfiniteData = {
  pages: AthletesPage[];
  pageParams: (string | null)[];
};

/** Query string for /api/athlete/athletes-all and /api/export (empty keys dropped). */
export function athleteFilterParams(filters: AthleteFilters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  return params;
}

export const UseGetAllAthletes = ({
  filters,
  initialData,
}: {
  filters: AthleteFilters;
  initialData?: AthletesInfiniteData;
}) => {
  const hasFilters = Object.values(filters).some(Boolean);

  return useInfiniteQuery<AthletesPage>({
    // Only seed the query with the server-rendered first page when no
    // filter is active — the same shape react-query is asked to fetch
    // itself, so it's used as-is instead of triggering a redundant fetch.
    initialData: hasFilters ? undefined : initialData,
    queryKey: ["all-athletes", filters],
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string | undefined) ?? "";

      const params = athleteFilterParams(filters);
      params.set("pageSize", "10");
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/athlete/athletes-all?${params.toString()}`);
      if (!res.ok) throw new Error("Error fetching athletes");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};
