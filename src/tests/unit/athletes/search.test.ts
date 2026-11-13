import { describe, expect, it } from "vitest";
import { athleteIdMatch, athleteIdTerm } from "@/features/athletes/queries/filters";

const ci = (contains: string) => ({ contains, mode: "insensitive" });

describe("searching by athlete ID", () => {
  it("treats dashes and slashes alike, and looks in the ID they had before", () => {
    expect(athleteIdMatch("ATH-FFA-M-501")).toEqual([
      { athleteId: ci("ATH/FFA/M/501") },
      { athleteId: ci("ATH-FFA-M-501") },
      { formerAthleteId: ci("ATH-FFA-M-501") },
    ]);
    expect(athleteIdTerm("ATH/FFA/501")).toEqual({ OR: athleteIdMatch("ATH/FFA/501") });
    expect(athleteIdTerm("ffa-50")).toEqual({ OR: athleteIdMatch("ffa-50") });
  });

  it("reads a short number as the athlete number in any programme, or the one they had before", () => {
    const num = (n: string) => ({
      OR: [{ athleteId: { endsWith: `-${n}` } }, { athleteId: { endsWith: `/${n}` } }, { formerAthleteId: { endsWith: `-${n}` } }],
    });
    expect(athleteIdTerm("501")).toEqual(num("501"));
    expect(athleteIdTerm("7")).toEqual(num("007"));
    expect(athleteIdTerm("0501")).toEqual(num("501"));
    expect(athleteIdTerm("1203")).toEqual(num("1203"));
  });

  it("reads a programme code and number", () => {
    expect(athleteIdTerm("G/1")).toEqual({ athleteId: { endsWith: "/G/001", mode: "insensitive" } });
    expect(athleteIdTerm("m-501")).toEqual({ athleteId: { endsWith: "/m/501", mode: "insensitive" } });
  });

  it("leaves names and phone numbers to the normal search", () => {
    expect(athleteIdTerm("0712345678")).toBeNull();
    expect(athleteIdTerm("Wanjiru")).toBeNull();
  });
});
