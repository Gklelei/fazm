import { describe, expect, it } from "vitest";
import { PREFERENCE_SCHEMAS } from "@/features/settings/schemas/preferences";

describe("settings schemas", () => {
  it("cleans document settings", () => {
    const v = PREFERENCE_SCHEMAS.documents.parse({ invoicePrefix: " inv ", receiptPrefix: "fees", invoiceDueDays: "10", kraPin: "p051234567x", documentTerms: "  " });
    expect(v).toEqual({ invoicePrefix: "INV", receiptPrefix: "FEES", invoiceDueDays: 10, kraPin: "P051234567X", documentTerms: null });
  });

  it("refuses the same letters, a bad PIN and out-of-range days", () => {
    const r = PREFERENCE_SCHEMAS.documents.safeParse({ invoicePrefix: "INV", receiptPrefix: "INV", invoiceDueDays: "91", kraPin: "123", documentTerms: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(["invoiceDueDays", "kraPin", "receiptPrefix"]);
  });

  it("treats an empty attendance limit as no limit", () => {
    expect(PREFERENCE_SCHEMAS.attendance.parse({ sessionMinutes: "90", attendanceEditDays: "", inactiveWeeks: "13" }).attendanceEditDays).toBeNull();
    expect(PREFERENCE_SCHEMAS.attendance.safeParse({ sessionMinutes: "5", attendanceEditDays: "", inactiveWeeks: "13" }).success).toBe(false);
  });

  it("only accepts known documents", () => {
    expect(PREFERENCE_SCHEMAS.registration.safeParse({ requiredDocuments: ["PASSPORT"] }).success).toBe(true);
    expect(PREFERENCE_SCHEMAS.registration.safeParse({ requiredDocuments: ["SELFIE"] }).success).toBe(false);
  });
});
