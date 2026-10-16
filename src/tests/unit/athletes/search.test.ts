import { describe, expect, it } from "vitest";
import { athleteIdTerm } from "@/features/athletes/queries/filters";

describe("searching by athlete ID", () => {
  it("matches IDs only, never phone numbers", () => {
    expect(athleteIdTerm("ATH-FFA-501")).toEqual({ athleteId: { contains: "ATH-FFA-501", mode: "insensitive" } });
    expect(athleteIdTerm("ffa-50")).toEqual({ athleteId: { contains: "ffa-50", mode: "insensitive" } });
  });

  it("reads a short number as the athlete number", () => {
    expect(athleteIdTerm("501")).toEqual({ athleteId: { endsWith: "-501" } });
    expect(athleteIdTerm("7")).toEqual({ athleteId: { endsWith: "-007" } });
  });

  it("leaves names and phone numbers to the normal search", () => {
    expect(athleteIdTerm("0712345678")).toBeNull();
    expect(athleteIdTerm("Wanjiru")).toBeNull();
  });
});
