"use client";

import { useEffect } from "react";

/**
 * Asks before closing or reloading the tab while a form has unsaved changes.
 * ponytail: covers tab close/reload only; in-app links aren't intercepted (the
 * App Router has no navigation-block API). Forms put Cancel behind a confirm.
 */
export function useLeaveWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
