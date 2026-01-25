"use client";

import React, { createContext, useContext } from "react";

type UtilsContextValue = {
  data: UtilsResponse | null;
  utilsLoading: boolean;
};

const UtilsContext = createContext<UtilsContextValue | undefined>(undefined);

export const UtilsContextProvider = ({
  value,
  children,
  utilsLoading,
}: React.PropsWithChildren<{
  value: UtilsResponse;
  utilsLoading: boolean;
}>) => (
  <UtilsContext.Provider value={{ data: value, utilsLoading }}>
    {children}
  </UtilsContext.Provider>
);

export function UseUtilsContext() {
  const contex = useContext(UtilsContext);

  if (!contex) {
    throw new Error("useUtils must be used within a UtilsContextProvider");
  }

  return contex;
}
