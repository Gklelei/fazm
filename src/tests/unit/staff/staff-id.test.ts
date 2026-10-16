import { describe, expect, it } from "vitest";
import { nextStaffId } from "@/features/staff/lib/staff-id";

describe("nextStaffId", () => {
  it("starts at 1001", () => expect(nextStaffId([])).toBe("STAFF-FFA-1001"));
  it("follows the highest number, including old random ones", () =>
    expect(nextStaffId(["STAFF-FFA-4821", "STAFF-FFA-1002", "STF-DEV-01"])).toBe("STAFF-FFA-4822"));
  it("keeps counting past 9999", () => expect(nextStaffId(["STAFF-FFA-9999"])).toBe("STAFF-FFA-10000"));
  it("ignores ids that aren't numbers", () => expect(nextStaffId(["STAFF-FFA-ABC"])).toBe("STAFF-FFA-1001"));
});
