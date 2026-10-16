"use client";

import { useQuery } from "@tanstack/react-query";
import { UtilsContextProvider } from "@/providers/UtilsContext";

async function fetchUtils(): Promise<UtilsResponse | null> {
  const res = await fetch("/api/settings/utils", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch utils");
  return res.json();
}

/**
 * Settings lookups for the signed-in app. The first value comes from the
 * server with the page (no loader, no extra round trip); components that
 * change settings invalidate ["utils"] to refetch.
 */
export function UtilsProviderWrapper({
  initialData,
  children,
}: {
  initialData: UtilsResponse;
  children: React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ["utils"],
    queryFn: fetchUtils,
    initialData,
    staleTime: Infinity,
  });

  return (
    <UtilsContextProvider value={data ?? null} utilsLoading={false}>
      {children}
    </UtilsContextProvider>
  );
}
