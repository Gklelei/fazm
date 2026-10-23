import { describe, expect, it } from "vitest";
import { getAllowedRolesForPath } from "@/components/layout/nav-config";

describe("page access", () => {
  it("lets every role open their own profile", () => {
    for (const role of ["COACH", "DOCTOR", "FINANCE", "ADMIN", "SUPER_ADMIN"] as const) expect(getAllowedRolesForPath("/staff/profile")).toContain(role);
  });
  it("keeps the staff list and staff pages for admins", () => {
    expect(getAllowedRolesForPath("/staff")).not.toContain("COACH");
    expect(getAllowedRolesForPath("/staff/STAFF-FFA-1001")).not.toContain("COACH");
  });
});

describe("activity log", () => {
  it("is for the developer (super admin) only", () => {
    expect(getAllowedRolesForPath("/settings/audit-logs")).toEqual(["SUPER_ADMIN"]);
    expect(getAllowedRolesForPath("/settings")).toContain("ADMIN");
  });
});

describe("payroll", () => {
  it("opens for the payroll person and the super admin only", async () => {
    const { canRunPayroll } = await import("@/lib/roles");
    const { findNavItem } = await import("@/components/layout/nav-config");
    expect(findNavItem("/payroll")?.item.payroll).toBe(true);
    expect(canRunPayroll({ role: "ADMIN", payrollAccess: true })).toBe(true);
    expect(canRunPayroll({ role: "SUPER_ADMIN" })).toBe(true);
    expect(canRunPayroll({ role: "ADMIN" })).toBe(false);
    expect(canRunPayroll({ role: "FINANCE" })).toBe(false);
  });
});
