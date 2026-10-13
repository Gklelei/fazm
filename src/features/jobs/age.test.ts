import { describe, expect, it } from "vitest";
import { ageFromDob } from "./age";

const today = new Date(2026, 9, 14); // 14 Oct 2026

describe("ageFromDob", () => {
  it("reads the form's YYYY-MM-DD", () => {
    expect(ageFromDob("2018-04-11", today)).toBe(8);
  });
  it("counts the birthday only once it has passed", () => {
    expect(ageFromDob("2016-10-14", today)).toBe(10);
    expect(ageFromDob("2016-10-15", today)).toBe(9);
  });
  it("reads DD/MM/YYYY and ISO timestamps", () => {
    expect(ageFromDob("24/10/2013", today)).toBe(12);
    expect(ageFromDob("2015-03-10T00:00:00.000Z", today)).toBe(11);
  });
  it("returns null for empty, unreadable or absurd values", () => {
    expect(ageFromDob("", today)).toBeNull();
    expect(ageFromDob("not a date", today)).toBeNull();
    expect(ageFromDob("1800-01-01", today)).toBeNull();
    expect(ageFromDob("2030-01-01", today)).toBeNull();
  });
});
