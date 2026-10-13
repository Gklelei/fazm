import type { ROLES } from "@/generated/prisma/enums";

/**
 * Who may do what. Used by the sidebar, the route proxy and server actions,
 * so a page a role can open is also a page whose actions that role can use.
 */
export const ROLE_GROUPS = {
  /** Squad, staff and settings administration */
  admin: ["SUPER_ADMIN", "ADMIN"],
  /** Invoices, payments, fee plans, coupons, expenses */
  finance: ["SUPER_ADMIN", "ADMIN", "FINANCE"],
  /** Sessions, attendance, assessments */
  coaching: ["SUPER_ADMIN", "ADMIN", "COACH"],
} as const satisfies Record<string, readonly ROLES[]>;

export type RoleGroup = keyof typeof ROLE_GROUPS;

export function hasRole(
  role: string | null | undefined,
  group: RoleGroup,
): boolean {
  return !!role && (ROLE_GROUPS[group] as readonly string[]).includes(role);
}

export const FORBIDDEN_MESSAGE = "You don't have permission to do this.";
