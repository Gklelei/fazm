"use client";
import { authClient } from "@/lib/auth-client";
import { createContext, useContext } from "react";

const SessionContext = createContext<typeof authClient.$Infer.Session | null>(
  null,
);

export default function SessionContextProvider({
  value,
  children,
}: React.PropsWithChildren<{
  value: typeof authClient.$Infer.Session;
}>) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within a SessionProvider");
  }
  return context;
}
