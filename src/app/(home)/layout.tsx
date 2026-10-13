import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NAV_GROUPS_COOKIE } from "@/components/layout/nav-config";
import { AppHeader } from "@/components/layout/AppHeader";
import SessionContextProvider from "@/providers/SessionProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  // Remember collapsed/expanded across reloads (the sidebar writes this cookie)
  const jar = await cookies();
  const sidebarOpen = jar.get("sidebar_state")?.value !== "false";
  const openNavGroups = decodeURIComponent(jar.get(NAV_GROUPS_COOKIE)?.value ?? "")
    .split("|")
    .filter(Boolean);

  return (
    <SessionContextProvider value={session}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar initialOpenGroups={openNavGroups} />
        <SidebarInset>
          <AppHeader />
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SessionContextProvider>
  );
}
