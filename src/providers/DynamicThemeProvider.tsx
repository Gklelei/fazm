"use client";

import { UseUtilsContext } from "@/providers/UtilsContext";
import { useEffect } from "react";
import { themeAttributes } from "@/lib/brand-color";

/** Applies a changed academy colour without a reload (the first one comes with the page). */
export function DynamicThemeProvider() {
  const color = UseUtilsContext().data?.academy?.primaryColor;

  useEffect(() => {
    const t = themeAttributes(color);
    const html = document.documentElement;
    html.setAttribute("data-theme-color", t["data-theme-color"]);
    if ("style" in t) html.style.setProperty("--brand-custom", String(color));
    else html.style.removeProperty("--brand-custom");
  }, [color]);

  return null;
}
