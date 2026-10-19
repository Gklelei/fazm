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
