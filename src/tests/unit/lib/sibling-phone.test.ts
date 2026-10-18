import { describe, expect, it } from "vitest";
import { siblingPhoneKey } from "@/features/families/lib/phone-key";

describe("sibling phone key", () => {
  it("matches the same mobile however it was typed", () => {
    expect(siblingPhoneKey("+254 711 872 468")).toBe("0711872468");
    expect(siblingPhoneKey("0711872468")).toBe("0711872468");
    expect(siblingPhoneKey("711872468")).toBe("0711872468");
  });
  it("ignores placeholders and junk", () => {
    for (const p of ["123456789", "0123456789", "0700000000", "0711111111", "", null, "12345"]) expect(siblingPhoneKey(p)).toBeNull();
  });
});
