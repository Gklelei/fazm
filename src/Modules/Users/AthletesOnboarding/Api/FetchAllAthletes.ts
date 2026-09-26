"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Prisma } from "@/generated/prisma/client";

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

export const UseGetAllAthletes = ({
  search,
  initialData,
}: {
  search: string;
  initialData?: AthletesInfiniteData;
}) => {
  return useInfiniteQuery<AthletesPage>({
    // Only seed the query with the server-rendered first page when no
    // filter is active — the same shape react-query is asked to fetch
    // itself, so it's used as-is instead of triggering a redundant fetch.
    initialData: search === "" ? initialData : undefined,
    queryKey: ["all-athletes", search],
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string | undefined) ?? "";

      const params = new URLSearchParams({
        pageSize: "10",
        search,
      });

      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/athlete/athletes-all?${params.toString()}`);
      if (!res.ok) throw new Error("Error fetching athletes");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};