"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { LoadMore } from "@/components/shared/LoadMore";
import type { SessionsPage } from "../queries/list-sessions";
import { SessionsList } from "./SessionsList";

/** The sessions list; further pages load as you scroll (shared cursor paging). */
export function SessionsFeed({ query, initial }: { query: string; initial: SessionsPage }) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["sessions", query],
    initialData: { pages: [initial], pageParams: [""] },
    queryFn: async ({ pageParam }): Promise<SessionsPage> => {
      const params = new URLSearchParams(query);
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`/api/sessions?${params}`);
      if (!res.ok) throw new Error("Couldn't load sessions");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });
  const rows = data.pages.flatMap((p) => p.rows);
  return (
    <>
      <SessionsList rows={rows} />
      <LoadMore
        shown={rows.length}
        total={data.pages[0].total}
        noun={["session", "sessions"]}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}
