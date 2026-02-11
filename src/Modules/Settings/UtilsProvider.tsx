"use client";

import { useQuery } from "@tanstack/react-query";
import { UtilsContextProvider } from "../Context/UtilsContext";
import AppLoader from "@/utils/Alerts/Apploader";

const REFRESH_INTERVAL = 30 * 60 * 1000;

async function fetchUtils(): Promise<UtilsResponse> {
  const res = await fetch("/api/settings/utils", { cache: "no-store" });
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

  if (isLoading || !data) {
    return <AppLoader />;
  }

  return (
    <UtilsContextProvider value={data} utilsLoading={false}>
      {children}
    </UtilsContextProvider>
  );
}
