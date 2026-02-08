"use client";
import { useInfiniteQuery } from "@tanstack/react-query";

interface Props {
  allAthletes: AthleteListResponse;
  nextCursor: number | null;
}

export const UseGetAllAthletes = ({ search }: { search: string }) => {
  return useInfiniteQuery<Props>({
    queryKey: ["all-athltes", search],
    queryFn: async ({ pageParam = 1 }) => {
      const page = pageParam as number;
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "10",
        search: search,
      });
      const response = await fetch(
        `/api/athlete/athletes-all?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Error fetching data");
      }

      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};
