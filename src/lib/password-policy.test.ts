import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password-policy";

describe("passwordProblem", () => {
  it("accepts 12+ characters of any kind", () => {
    expect(passwordProblem("correcthorsebattery")).toBeNull();
    expect(passwordProblem("aaaaaaaaaaaa")).toBeNull();
  });
  it("accepts 8–11 characters when upper, lower, number and symbol are all present", () => {
    expect(passwordProblem("Fazam#2026")).toBeNull();
    expect(passwordProblem("Ab1!efgh")).toBeNull();
  });
  it("rejects short passwords missing any character type", () => {
    expect(passwordProblem("Fazam2026")).not.toBeNull(); // no symbol
    expect(passwordProblem("fazam#2026")).not.toBeNull(); // no upper
    expect(passwordProblem("FAZAM#2026")).not.toBeNull(); // no lower
    expect(passwordProblem("Fazam#abc")).not.toBeNull(); // no number
  });
  it("rejects anything under 8 characters", () => {
    expect(passwordProblem("Ab1!efg")).not.toBeNull();
    expect(passwordProblem("")).not.toBeNull();
  });
  it("rejects leading/trailing spaces and absurd lengths", () => {
    expect(passwordProblem(" correcthorsebattery")).not.toBeNull();
    expect(passwordProblem("a".repeat(129))).not.toBeNull();
  });
});
