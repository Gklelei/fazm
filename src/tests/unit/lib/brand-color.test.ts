import { describe, expect, it } from "vitest";
import { contrastWithWhite, readableOnWhite, themeAttributes } from "@/lib/brand-color";

describe("academy colour", () => {
  it("measures white text contrast", () => {
    expect(contrastWithWhite("#000000")).toBeCloseTo(21, 0);
    expect(contrastWithWhite("#ffffff")).toBeCloseTo(1, 1);
    expect(readableOnWhite("#1d4ed8")).toBe(true); // a dark blue
    expect(readableOnWhite("#facc15")).toBe(false); // yellow
  });

  it("falls back to Fazam for anything unknown", () => {
    expect(themeAttributes("blue", "pitch")).toEqual({ "data-app-theme": "pitch", "data-theme-color": "blue" });
    expect(themeAttributes("purple", "neon")).toEqual({ "data-app-theme": "fazam", "data-theme-color": "fazam" });
    expect(themeAttributes(null)).toEqual({ "data-app-theme": "fazam", "data-theme-color": "fazam" });
    expect(themeAttributes("#1d4ed8", "light")).toEqual({ "data-app-theme": "light", "data-theme-color": "custom", style: { "--brand-custom": "#1d4ed8" } });
  });
});
