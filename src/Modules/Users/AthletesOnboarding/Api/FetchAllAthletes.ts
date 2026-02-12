"use client";
import { useInfiniteQuery } from "@tanstack/react-query";

type AthletesPage = {
  allAthletes: AthleteListResponse;
  nextCursor: string | null;
  pageSize: number;
};

export const UseGetAllAthletes = ({ search }: { search: string }) => {
  return useInfiniteQuery<AthletesPage>({
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
