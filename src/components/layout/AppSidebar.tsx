"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useAuthSession } from "@/providers/SessionProvider";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { findNavItem, isActivePath, NAV_GROUPS_COOKIE, navForRole, type AppRole, type NavItem } from "./nav-config";

const ROLE_LABEL: Record<AppRole, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  COACH: "Coach",
  DOCTOR: "Medical",
  FINANCE: "Finance",
};

/**
 * The footer's top border is the halfway line; the centre circle sits on it.
 * The sidebar is the pitch.
 */
function CentreCircle() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      className="pointer-events-none absolute top-0 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 text-white/[0.07] group-data-[collapsible=icon]:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <circle cx="60" cy="60" r="44" />
      <circle cx="60" cy="60" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Remembered per browser, read by the layout so the first paint matches. */
function saveOpenGroups(labels: Set<string>) {
  document.cookie = `${NAV_GROUPS_COOKIE}=${encodeURIComponent([...labels].join("|"))}; path=/; max-age=31536000; samesite=lax`;
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className={cn(
          "relative h-9 text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white",
          // Captain's armband: a gold bar marks where you are
          "data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white",
          "data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r data-[active=true]:before:bg-sidebar-primary",
        )}
      >
        <Link href={item.url} onClick={onNavigate}>
          <item.icon className={cn(active && "text-sidebar-primary")} />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  initialOpenGroups = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { initialOpenGroups?: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile, toggleSidebar, state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuthSession();
  const { data: utils } = UseUtilsContext();
  const role = (user.role as AppRole | undefined) ?? null;
  const sections = navForRole(role);
  const academyName = utils?.academy?.academyName || "Fazam Football Academy";

  // Groups fold so only what you're working in is expanded. The group of the
  // current page is always open on arrival; others stay as you left them.
  const activeGroup = findNavItem(pathname)?.section.label;
  const [opened, setOpened] = useState(() => new Set(initialOpenGroups));
  const [closedHere, setClosedHere] = useState<{ label: string; path: string } | null>(null);
  const isOpen = (label: string) =>
    opened.has(label) ||
    (label === activeGroup && !(closedHere?.label === label && closedHere.path === pathname));
  const toggle = (label: string) => {
    const open = !isOpen(label);
    const next = new Set(opened);
    if (open) next.add(label);
    else next.delete(label);
    setOpened(next);
    setClosedHere(open ? null : { label, path: pathname });
    saveOpenGroups(next);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-3 pt-4 pb-2 group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md p-1 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          aria-label="Dashboard"
        >
          <Image
            src="/Fazam Logo-BG.png"
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain group-data-[collapsible=icon]:size-8"
            priority
          />
          <span className="grid leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-display text-lg font-bold uppercase tracking-wide text-white">
              Fazam
            </span>
            <span className="mt-0.5 truncate text-[11px] text-sidebar-foreground/70">
              {academyName}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        {sections.map((section) => {
          const closeNav = () => setOpenMobile(false);
          // A one-link group (Overview) has nothing to fold
          if (section.items.length === 1) {
            return (
              <SidebarGroup key={section.label} className="py-1.5">
                <SidebarMenu>
                  <NavLink item={section.items[0]} active={isActivePath(pathname, section.items[0].url)} onNavigate={closeNav} />
                </SidebarMenu>
              </SidebarGroup>
            );
          }
          const open = isOpen(section.label);
          const holdsActive = section.label === activeGroup;
          const id = `nav-${section.label.toLowerCase()}`;
          return (
            <SidebarGroup key={section.label} className="py-1">
              <button
                type="button"
                onClick={() => toggle(section.label)}
                aria-expanded={open}
                aria-controls={id}
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left font-display text-[11px] font-semibold tracking-[0.18em] text-sidebar-foreground/55 uppercase transition-colors hover:bg-sidebar-accent/60 hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden"
              >
                <span className="flex-1">{section.label}</span>
                {/* Folded away but you're inside it: a gold dot says so */}
                {!open && holdsActive && <span aria-hidden className="size-1.5 rounded-full bg-sidebar-primary" />}
                {!open && (
                  <span className="tabular rounded bg-sidebar-accent px-1.5 py-px font-sans text-[10px] tracking-normal text-sidebar-foreground/70">
                    {section.items.length}
                  </span>
                )}
                <ChevronRight
                  aria-hidden
                  className={cn("size-3.5 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-90")}
                />
              </button>
              {/* Height animates via grid rows; icon-only mode always shows every link */}
              <div
                id={id}
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none group-data-[collapsible=icon]:grid-rows-[1fr]",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <SidebarGroupContent className="overflow-hidden" inert={!open && !collapsed ? true : undefined}>
                  <SidebarMenu className="pt-0.5">
                    {section.items.map((item) => (
                      <NavLink key={item.url} item={item} active={isActivePath(pathname, item.url)} onNavigate={closeNav} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </div>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="relative gap-1 border-t border-sidebar-border p-2">
        <CentreCircle />
        {!isMobile && (
          <SidebarMenu className="relative">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip={collapsed ? "Expand sidebar · Ctrl B" : undefined}
                aria-expanded={!collapsed}
                className="h-8 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white"
              >
                {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                <span>Collapse sidebar</span>
                <kbd className="ml-auto rounded border border-sidebar-border px-1 font-sans text-[10px] text-sidebar-foreground/50">
                  Ctrl B
                </kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <div className="relative flex items-center gap-2.5 p-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          <Avatar className="size-8 shrink-0 ring-1 ring-sidebar-primary/40">
            <AvatarImage src={user.image ?? ""} alt="" />
            <AvatarFallback className="bg-sidebar-primary font-display font-bold text-sidebar-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold text-white">
              {user.name}
            </span>
            <span className="truncate text-xs text-sidebar-primary">
              {role ? ROLE_LABEL[role] : "No role assigned"}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.push("/sign-in");
            }}
            className="grid size-8 shrink-0 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
