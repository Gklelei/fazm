"use client";

import { ReactNode } from "react";
import { UtilsProviderWrapper } from "@/providers/UtilsProvider";
import { DynamicThemeProvider } from "@/providers/DynamicThemeProvider";

/** Signed-in app only: settings lookups, and live updates to the academy colour. */
const MainLayoutWrapper = ({
  utils,
  children,
}: {
  utils: UtilsResponse;
  children: ReactNode;
}) => (
  <UtilsProviderWrapper initialData={utils}>
    <DynamicThemeProvider />
    {children}
  </UtilsProviderWrapper>
);

export default MainLayoutWrapper;
