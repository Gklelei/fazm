"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

import { data, type AppRole } from "./SideBarItems";
import { useQuery } from "@tanstack/react-query";

type RoleResponse = { role: AppRole | null };

export function useUserRole() {
  return useQuery<RoleResponse>({
    queryKey: ["auth", "role"],
    queryFn: async () => {
      const res = await fetch("/api/user/role", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch role");
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });
}

const isAllowed = (roles: AppRole[] | undefined, userRole: AppRole | null) => {
  if (!roles?.length) return true;
  if (!userRole) return false;
  return roles.includes(userRole);
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathName = usePathname();
  const isStaffProfile = pathName.startsWith("/users/staff/profile");

  const { data: roleData, isLoading, isError } = useUserRole();
  const userRole = roleData?.role ?? null;

  const nav = React.useMemo(() => {
    const effectiveRole = isLoading || isError ? null : userRole;

    return data.navMain
      .filter((item) => isAllowed(item.roles, effectiveRole))
      .map((item) => {
        const filteredSubs = (item.items ?? []).filter((sub) =>
          isAllowed(sub.roles, effectiveRole),
        );
        return { ...item, items: filteredSubs };
      })
      .filter((item) => (item.items ? item.items.length > 0 : true));
  }, [userRole, isLoading, isError]);

  return (
    <Sidebar
      {...props}
      className={cn("", isStaffProfile ? "border" : "border-none")}
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
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Loading menu…
            </div>
          ) : null}

          <SidebarMenu>
            {nav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton className="font-medium cursor-pointer">
                  {item.icon}
                  <span>{item.title}</span>

                  {!!item.items?.length && (
                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/sidebar-menu-button:rotate-90" />
                  )}
                </SidebarMenuButton>

                {!!item.items?.length ? (
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link
                            href={subItem.url}
                            className="flex items-center gap-2"
                          >
                            {subItem.icon}
                            <span>{subItem.title}</span>
                          </Link>
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
