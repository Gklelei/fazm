"use client";
import * as React from "react";
import { ChevronRight } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { data } from "./SideBarItems";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathName = usePathname();
  const isStaff = pathName.startsWith("/users/staff/profile");
  return (
    <Sidebar
      {...props}
      className={cn("", isStaff ? "border" : "border-none")}
      collapsible="offcanvas"
    >
      <SidebarHeader className="bg-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/">
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Fazam</span>
                <span className="">Football Academy</span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton className="font-medium cursor-pointer">
                  {item.icon}
                  <span>{item.title}</span>
                  {item.items?.length && (
                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/sidebar-menu-button:rotate-90" />
                  )}
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <a href={subItem.url}>
                            {subItem.icon}
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
