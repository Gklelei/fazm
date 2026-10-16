import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/prisma";
import { resetDb, signedIn } from "@/tests/support/db";
import { createStaff } from "@/features/staff/actions/save-staff";

// Fail halfway: after the login's user row is written, before the staff row
vi.mock("@/features/staff/lib/temp-password", () => ({
  tempPassword: () => {
    throw new Error("outage");
  },
}));

describe("adding staff with a sign-in", () => {
  beforeEach(resetDb);

  it("leaves no login behind when it fails partway", async () => {
    const { user: admin } = await signedIn("ADMIN");
    const res = await createStaff({
      fullNames: "Half Made",
      phoneNumber: "0712345678",
      email: "half@example.test",
      photo: "",
      jobTitle: "",
      startDate: "",
      nationalId: "",
      kraPin: "",
      nssfNumber: "",
      shifNumber: "",
      salary: "",
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelationship: "",
      batches: [],
      documents: [],
      canSignIn: true,
      role: "COACH",
    });
    expect(res.success).toBe(false);
    expect(await db.user.count({ where: { email: "half@example.test" } })).toBe(0);
    expect(await db.staff.count()).toBe(0);
    expect(await db.user.count()).toBe(1); // only the admin running the test
    expect(admin).toBeTruthy();
  });
});
