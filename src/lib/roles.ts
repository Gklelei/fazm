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
  /** Opening athlete profiles and editing their details (medical staff: medical details only) */
  athletes: ["SUPER_ADMIN", "ADMIN", "COACH", "DOCTOR"],
  /** Changing medical details */
  medical: ["SUPER_ADMIN", "ADMIN", "DOCTOR"],
  /** The developer: the activity log */
  developer: ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly ROLES[]>;

export type RoleGroup = keyof typeof ROLE_GROUPS;

export function hasRole(
  role: string | null | undefined,
  group: RoleGroup,
): boolean {
  return !!role && (ROLE_GROUPS[group] as readonly string[]).includes(role);
}

/**
 * Payroll (salaries, pay details, advances, payslips): the one payroll
 * person, plus the super admin (the developer) for support.
 */
export function canRunPayroll(user: { role?: string | null; payrollAccess?: boolean | null } | null | undefined): boolean {
  return !!user && (user.role === "SUPER_ADMIN" || user.payrollAccess === true);
}

export const FORBIDDEN_MESSAGE = "You don't have permission to do this.";

/** How each role reads on screen. */
export const ROLE_LABEL: Record<ROLES, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  COACH: "Coach",
  DOCTOR: "Medical",
  FINANCE: "Finance",
};
