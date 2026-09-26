"use client";
import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface props {
  children: ReactNode;
}
const ReactQueryClientProvider = ({ children }: props) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 0,
            // Previously unset (defaults to 0), so every remount refetched
            // even near-static data. A short default avoids that while
            // still keeping data reasonably fresh; any query that needs to
            // be more (or less) live can still override this per-query.
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default ReactQueryClientProvider;
