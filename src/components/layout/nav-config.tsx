import {
  BarChart3,
  Building2,
  ClipboardCheck,
  CalendarDays,
  HeartHandshake,
  LayoutDashboard,
  ListTree,
  Receipt,
  ScrollText,
  Settings2,
  Shirt,
  Tag,
  UserCog,
  Wallet,
  WalletCards,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import { ROLES } from "@/generated/prisma/enums";

// Derived from the Prisma enum so it can never drift from the database.
export type AppRole = ROLES;
export const ALL_ROLES: AppRole[] = Object.values(ROLES);

const ADMINS: AppRole[] = ["SUPER_ADMIN", "ADMIN"];
const FINANCE: AppRole[] = [...ADMINS, "FINANCE"];
const COACHING: AppRole[] = [...ADMINS, "COACH"];

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: AppRole[];
};

export type NavSection = { label: string; items: NavItem[] };

/**
 * Single source of truth for navigation AND route access: the proxy calls
 * getAllowedRolesForPath() with these same entries, so the sidebar can never
 * advertise a page a role is blocked from (or hide one it may open).
 */
export const NAV: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ALL_ROLES },
    ],
  },
  {
    label: "Squad",
    items: [
      {
        title: "Athletes",
        url: "/players",
        icon: Shirt,
        roles: [...COACHING, "DOCTOR"],
      },
      {
        title: "Guardians",
        url: "/guardians",
        icon: HeartHandshake,
        roles: ADMINS,
      },
      { title: "Staff", url: "/staff", icon: UserCog, roles: ADMINS },
    ],
  },
  {
    label: "Training",
    items: [
      {
        title: "Sessions",
        url: "/sessions",
        icon: CalendarDays,
        roles: COACHING,
      },
      {
        title: "Assessments",
        url: "/assesments",
        icon: ClipboardCheck,
        roles: COACHING,
      },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Invoices", url: "/invoices", icon: Receipt, roles: FINANCE },
      { title: "Payments", url: "/transactions", icon: Banknote, roles: FINANCE },
      { title: "Fee plans", url: "/fees", icon: WalletCards, roles: FINANCE },
      { title: "Coupons", url: "/coupons", icon: Tag, roles: FINANCE },
      { title: "Expenses", url: "/expenses", icon: Wallet, roles: FINANCE },
      {
        title: "Expense categories",
        url: "/expenses-categories",
        icon: ListTree,
        roles: FINANCE,
      },
    ],
  },
  {
    label: "Club",
    items: [
      { title: "Reports", url: "/stats", icon: BarChart3, roles: ADMINS },
      {
        title: "Academy profile",
        url: "/academy",
        icon: Building2,
        roles: ADMINS,
      },
      { title: "Settings", url: "/settings", icon: Settings2, roles: ADMINS },
      {
        title: "Activity log",
        url: "/settings/audit-logs",
        icon: ScrollText,
        roles: ADMINS,
      },
    ],
  },
];

export function navForRole(role: AppRole | null | undefined): NavSection[] {
  return NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => role && i.roles.includes(role)),
  })).filter((s) => s.items.length > 0);
}

export const isActivePath = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

/** The deepest nav entry matching `pathname` (for titles and access). */
export function findNavItem(pathname: string) {
  let best: { section: NavSection; item: NavItem } | null = null;
  for (const section of NAV) {
    for (const item of section.items) {
      if (
        isActivePath(pathname, item.url) &&
        (!best || item.url.length > best.item.url.length)
      ) {
        best = { section, item };
      }
    }
  }
  return best;
}

/**
 * Roles allowed to open `pathname`, or null when the path is not in the nav
 * (e.g. /mail) — meaning "any signed-in user", exactly as before.
 */
export function getAllowedRolesForPath(pathname: string): AppRole[] | null {
  return findNavItem(pathname)?.item.roles ?? null;
}
