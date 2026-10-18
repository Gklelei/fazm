"use client";

import { ReactNode } from "react";
import { UtilsProviderWrapper } from "@/providers/UtilsProvider";
import { DynamicThemeProvider } from "@/providers/DynamicThemeProvider";
import { IdleSignOut } from "@/providers/IdleSignOut";

/** Signed-in app only: settings lookups, live updates to the academy colour, idle sign-out. */
const MainLayoutWrapper = ({
  utils,
  children,
}: {
  utils: UtilsResponse;
  children: ReactNode;
}) => (
  <UtilsProviderWrapper initialData={utils}>
    <DynamicThemeProvider />
    <IdleSignOut />
    {children}
  </UtilsProviderWrapper>
);

export default MainLayoutWrapper;
