"use client";

import { UseUtilsContext } from "@/providers/UtilsContext";
import { useEffect } from "react";

export function DynamicThemeProvider() {
  const { data } = UseUtilsContext();
  const academy = data?.academy;
  const primaryColor = academy?.primaryColor || "fazam";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme-color", primaryColor);
  }, [primaryColor]);

  return null;
}
