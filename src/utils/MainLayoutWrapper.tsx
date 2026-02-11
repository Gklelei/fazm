"use client";

import { ReactNode } from "react";
import { UtilsProviderWrapper } from "@/Modules/Settings/UtilsProvider";

const MainLayoutWrapper = ({ children }: { children: ReactNode }) => {
  return <UtilsProviderWrapper>{children}</UtilsProviderWrapper>;
};

export default MainLayoutWrapper;
