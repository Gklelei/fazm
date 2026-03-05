"use client";

import { ReactNode } from "react";
import { UtilsProviderWrapper } from "@/Modules/Settings/UtilsProvider";
import { DynamicThemeProvider } from "@/components/DynamicThemeProvider";

const MainLayoutWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <UtilsProviderWrapper>
      <DynamicThemeProvider />
      {children}
    </UtilsProviderWrapper>
  );
};

export default MainLayoutWrapper;
