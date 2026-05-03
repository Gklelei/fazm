"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { data, type AppRole } from "./SideBarItems";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { authClient } from "@/lib/auth-client";

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
  const router = useRouter();

  // Try fetching current user session for the footer
  const { data: session } = authClient.useSession();
  const user = session?.user;
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
    <Sidebar {...props} className="border-r border-border/50 shadow-sm">
      <SidebarHeader className="border-b border-border/50 bg-sidebar/50 backdrop-blur-md p-4 pb-6">
        <div className="flex flex-col items-start gap-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-md ring-1 ring-primary/20">
                <LayoutDashboard className="h-5 w-5 drop-shadow-md" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Academy
                </span>
                <h2 className="text-sm font-bold leading-tight truncate max-w-35 text-foreground">
                  {utils?.academy?.academyName || "Fazam FC"}
                </h2>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border shadow-sm w-fit",
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

      <SidebarContent className="px-3 py-4 space-y-6">
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
                <div key={item.title} className="mb-6">
                  {/* Section Title */}
                  <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {item.title}
                  </h3>

                  {!hasSubs ? (
                    // Single item
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={parentActive}
                        tooltip={item.title}
                        className={cn(
                          "group h-10 w-full rounded-lg transition-all hover:bg-muted duration-200",
                          parentActive &&
                            "bg-primary/10 text-primary font-semibold relative after:absolute after:-left-3 after:top-1/2 after:-translate-y-1/2 after:h-6 after:w-1.5 after:rounded-r-full after:bg-primary shadow-sm",
                        )}
                      >
                        <Link
                          href={item.url || "#"}
                          className="flex items-center gap-3"
                        >
                          {item.icon && (
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-md transition-all duration-300 group-hover:scale-105",
                                parentActive
                                  ? "text-primary shadow-[inset_0_0_10px_rgba(0,0,0,0.05)] bg-background/50"
                                  : "text-muted-foreground group-hover:text-foreground group-hover:bg-background shadow-sm",
                              )}
                            >
                              {item.icon}
                            </span>
                          )}
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() =>
                          setOpenGroup((curr) =>
                            curr === item.title ? null : item.title,
                          )
                        }
                        isActive={parentActive}
                        className={cn(
                          "group h-10 w-full rounded-lg justify-between transition-all hover:bg-muted duration-200",
                          parentActive && !isOpen
                            ? "bg-primary/10 text-primary font-semibold relative after:absolute after:-left-3 after:top-1/2 after:-translate-y-1/2 after:h-6 after:w-1.5 after:rounded-r-full after:bg-primary shadow-sm"
                            : "",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon && (
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                                parentActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted",
                              )}
                            >
                              {item.icon}
                            </span>
                          )}
                          <span className="text-sm font-medium transition-colors group-hover:text-foreground">
                            {item.title}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
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
                            <SidebarMenuSub className="ml-5 mt-1 border-l-2 border-muted pl-4 space-y-1">
                              {item.items?.map((sub) => {
                                const isSubActive = isActivePath(
                                  pathname,
                                  sub.url,
                                );
                                return (
                                  <SidebarMenuSubItem key={sub.url}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isSubActive}
                                      className={cn(
                                        "h-9 rounded-md transition-all duration-200 hover:text-foreground my-0.5",
                                        isSubActive
                                          ? "text-primary font-bold bg-primary/10 shadow-sm ring-1 ring-primary/20"
                                          : "text-muted-foreground hover:bg-muted/60",
                                      )}
                                    >
                                      <Link
                                        href={sub.url}
                                        className="flex items-center gap-2"
                                      >
                                        {/* Subtle active indicator dot */}
                                        <span
                                          className={cn(
                                            "h-1.5 w-1.5 rounded-full transition-colors",
                                            isSubActive
                                              ? "bg-primary"
                                              : "bg-transparent group-hover:bg-muted-foreground/30",
                                          )}
                                        />
                                        <span>{sub.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </SidebarMenuItem>
                  )}
                </div>
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
      <SidebarFooter className="border-t bg-sidebar p-4">
        {user ? (
          <div className="flex items-center justify-between gap-2 overflow-hidden rounded-xl border bg-linear-to-tr from-muted/30 to-muted/10 p-2.5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 truncate">
              <Avatar className="h-9 w-9 border ring-2 ring-primary/20 shadow-sm">
                <AvatarImage src={user.image ?? ""} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                <span className="truncate text-sm font-semibold">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                await authClient.signOut();
                router.push("/sign-in");
              }}
              className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 truncate rounded-xl border bg-card p-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Guest User</span>
              <span className="text-xs text-muted-foreground">
                Sign in required
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
