"use client";

import { UseUtilsContext } from "@/providers/UtilsContext";
import { useEffect } from "react";
import { themeAttributes } from "@/lib/brand-color";

/** Applies a changed academy theme and colour without a reload (the first ones come with the page). */
export function DynamicThemeProvider() {
  const academy = UseUtilsContext().data?.academy;
  const color = academy?.primaryColor;
  const theme = academy?.theme;

  useEffect(() => {
    const t = themeAttributes(color, theme);
    const html = document.documentElement;
    html.setAttribute("data-app-theme", t["data-app-theme"]);
    html.setAttribute("data-theme-color", t["data-theme-color"]);
    if ("style" in t) html.style.setProperty("--brand-custom", String(color));
    else html.style.removeProperty("--brand-custom");
  }, [color, theme]);

  return null;
}
