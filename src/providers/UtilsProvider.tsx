"use client";

import { useQuery } from "@tanstack/react-query";
import { UtilsContextProvider } from "@/providers/UtilsContext";
import AppLoader from "@/components/shared/AppLoader";

const REFRESH_INTERVAL = 30 * 60 * 1000;

async function fetchUtils(): Promise<UtilsResponse | null> {
  const res = await fetch("/api/settings/utils", { cache: "no-store" });
  // Signed-out pages (sign-in, reset password) render without settings
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error("Failed to fetch utils");
  }
  return res.json();
}

export function UtilsProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["utils"],
    queryFn: fetchUtils,
    staleTime: REFRESH_INTERVAL,
    refetchInterval: REFRESH_INTERVAL,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return <AppLoader />;
  }

  return (
    <UtilsContextProvider value={data ?? null} utilsLoading={false}>
      {children}
    </UtilsContextProvider>
  );
}
