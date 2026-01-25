import { UserCircle } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const items = [
  {
    title: "Personal Information",
    url: "/users/staff/profile",
    icon: UserCircle,
  },
  // {
  //   title: "Account Security",
  //   url: "/users/staff/profile/account-settings",
  //   icon: KeyRound,
  // },
  // {
  //   title: "Active Sessions",
  //   url: "/users/staff/profile/sessions",
  //   icon: MonitorSmartphone,
  // },
];

export function StaffSideBar() {
  return (
    <Sidebar
      collapsible="none"
      side="left"
      className="top-[--header-height] h-[calc(100vh-var(--header-height))]"
      style={{ "--header-height": "4rem" } as React.CSSProperties}
    >
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex gap-3">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
