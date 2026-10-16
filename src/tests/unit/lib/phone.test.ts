import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each(["0757777343", "0757 777 343", "757777343", "+254757777343", "254 757-777-343", "+254 (757) 777 343"])("reads %s", (v) =>
    expect(normalizePhone(v)).toBe("0757777343"),
  );
  it("accepts 01 numbers", () => expect(normalizePhone("+254 110 123 456")).toBe("0110123456"));
  it.each(["", "12345", "0657777343", "07577773431", "+255757777343", "phone"])("refuses %s", (v) =>
    expect(normalizePhone(v)).toBeNull(),
  );
});

describe("formatPhone", () => {
  it("groups a stored number", () => expect(formatPhone("0757777343")).toBe("0757 777 343"));
  it("leaves odd values alone", () => expect(formatPhone("+1 555 0100")).toBe("+1 555 0100"));
});
