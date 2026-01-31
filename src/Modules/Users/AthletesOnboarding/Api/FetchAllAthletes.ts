"use client";
import { useQuery } from "@tanstack/react-query";

export const UseGetAllAthletes = () => {
  return useQuery<AthleteListResponse>({
    queryKey: ["all-athletes"],
    queryFn: async () => {
      const response = await fetch("/api/athlete/athletes-all", {
        method: "GET",
      });

      console.log(response);

      if (!response.ok) {
        throw new Error("Error fetching data");
      }
      const data = await response.json();
      return data;
    },
  });
};
