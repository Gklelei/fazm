"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The foot of every paged list: loads the next page as it scrolls into view,
 * with a button as a fallback, and says how much is showing.
 */
export function LoadMore({
  shown,
  total,
  noun,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  shown: number;
  total?: number;
  /** [one, many], e.g. ["athlete", "athletes"] */
  noun: [string, string];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  const { ref, inView } = useInView({ rootMargin: "400px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const count = total ?? shown;
  const label = `${total !== undefined && total > shown ? `Showing ${shown} of ${total}` : shown} ${count === 1 ? noun[0] : noun[1]}`;

  return (
    <div ref={ref} className="flex min-h-14 items-center justify-between gap-3 border-t px-4 py-2 text-sm text-muted-foreground">
      <span className="tabular">{label}</span>
      {isFetchingNextPage ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading more
        </span>
      ) : (
        hasNextPage && (
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
            Load more
          </Button>
        )
      )}
    </div>
  );
}
