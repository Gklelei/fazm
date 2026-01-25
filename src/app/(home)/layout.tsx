import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import SessionContextProvider from "@/Modules/Context/SessionProvider";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ProfileModal from "@/Modules/UserProfile/ProfileModal";
import { ModeToggle } from "@/components/ToggleTheme";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/sign-in");

  return (
    <SessionContextProvider value={session}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex items-center gap-10">
              <ProfileModal />
              <ModeToggle />
            </div>
          </header>

          <main className="p-4">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SessionContextProvider>
  );
}
