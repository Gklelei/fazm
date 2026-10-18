"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { UseUtilsContext } from "@/providers/UtilsContext";

const KEY = "fazm:last-active";
const EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/** Signs out after the idle minutes in Settings → Security. Activity in any open tab counts. */
export function IdleSignOut() {
  const minutes = UseUtilsContext().data?.academy?.sessionTimeoutMinutes;
  const router = useRouter();

  useEffect(() => {
    if (!minutes) return;
    let last = Date.now();
    const mark = () => {
      last = Date.now();
      try {
        localStorage.setItem(KEY, String(last));
      } catch {}
    };
    const lastActive = () => {
      try {
        return Math.max(last, Number(localStorage.getItem(KEY)) || 0);
      } catch {
        return last;
      }
    };
    mark();
    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = setInterval(async () => {
      if (Date.now() - lastActive() < minutes * 60_000) return;
      clearInterval(timer);
      await authClient.signOut();
      router.replace("/sign-in");
    }, 30_000);
    return () => {
      clearInterval(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [minutes, router]);

  return null;
}
