"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Loader2,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { data, type AppRole } from "./SideBarItems";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";

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

const isAllowed = (
  roles: AppRole[] | undefined,
  userRole: AppRole | null,
): boolean => {
  if (!roles?.length) return true;
  if (!userRole) return false;
  return roles.includes(userRole);
};

const isActivePath = (pathname: string, href: string): boolean => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: roleData, isLoading, isError } = useUserRole();
  const userRole = roleData?.role ?? null;
  const { data: utils } = UseUtilsContext();
  const nav = React.useMemo(() => {
    const effectiveRole = isLoading || isError ? null : userRole;
    return data.navMain
      .filter((item) => isAllowed(item.roles, effectiveRole))
      .map((item) => {
        const subs = (item.items ?? []).filter((sub) =>
          isAllowed(sub.roles, effectiveRole),
        );
        return { ...item, items: subs };
      })
      .filter((item) => (item.items ? item.items.length > 0 : true));
  }, [userRole, isLoading, isError]);

  // Expand the group that contains the active sub-route by default
  const defaultOpen = React.useMemo(() => {
    const activeParent = nav.find((p) =>
      p.items?.some((s) => isActivePath(pathname, s.url)),
    );
    return activeParent?.title ?? null;
  }, [nav, pathname]);

  const [openGroup, setOpenGroup] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultOpen) setOpenGroup(defaultOpen);
  }, [defaultOpen]);

  const getRoleBadgeColor = (role: AppRole | null) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
      case "ADMIN":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "COACH":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Sidebar {...props} className="border-r">
      <SidebarHeader className="border-b bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {utils?.academy?.academyName || "Fazam Football Academy"}
              </h2>
            </div>
          </div>
          {/* Smaller role badge */}
          <Badge
            variant="outline"
            className={cn(
              "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
              getRoleBadgeColor(userRole),
            )}
          >
            {isLoading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              (userRole ?? "GUEST")
            )}
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading menu...</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-xs font-medium text-destructive">
              Failed to load
            </p>
            <p className="text-xs text-muted-foreground">Please refresh</p>
          </div>
        )}

        {!isLoading && !isError && (
          <SidebarMenu>
            {nav.map((item) => {
              const hasSubs = !!item.items?.length;
              const isOpen = openGroup === item.title;
              const parentActive = hasSubs
                ? (item.items?.some((s) => isActivePath(pathname, s.url)) ??
                  false)
                : isActivePath(pathname, "");

              return (
                <SidebarMenuItem key={item.title}>
                  {!hasSubs ? (
                    // Single item
                    <SidebarMenuButton
                      asChild
                      isActive={parentActive}
                      tooltip={item.title}
                      className="group"
                    >
                      <Link href={"#"}>
                        {item.icon && (
                          <span className="mr-2 h-5 w-5">{item.icon}</span>
                        )}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    // Group with children
                    <>
                      <SidebarMenuButton
                        onClick={() =>
                          setOpenGroup((curr) =>
                            curr === item.title ? null : item.title,
                          )
                        }
                        isActive={parentActive}
                        className="group w-full justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {item.icon && (
                            <span className="h-5 w-5">{item.icon}</span>
                          )}
                          <span>{item.title}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isOpen && "rotate-180",
                          )}
                        />
                      </SidebarMenuButton>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <SidebarMenuSub>
                              {item.items?.map((sub) => (
                                <SidebarMenuSubItem key={sub.url}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActivePath(pathname, sub.url)}
                                    className="pl-9"
                                  >
                                    <Link href={sub.url}>
                                      <span>{sub.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </SidebarMenuItem>
              );
            })}

            {nav.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No menu items</p>
              </div>
            )}
          </SidebarMenu>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
