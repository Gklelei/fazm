import { describe, expect, it } from "vitest";
import { bucketRange } from "@/features/reports/lib/drill";

describe("bucketRange", () => {
  it("keeps a day as itself", () => expect(bucketRange("2026-10-05", "2026-10-01", "2026-10-19")).toEqual(["2026-10-05", "2026-10-05"]));
  it("covers a whole month inside the range", () => expect(bucketRange("2026-02", "2025-11-01", "2026-10-19")).toEqual(["2026-02-01", "2026-02-28"]));
  it("clips the first and last months to the range", () => {
    expect(bucketRange("2025-11", "2025-11-15", "2026-10-19")).toEqual(["2025-11-15", "2025-11-30"]);
    expect(bucketRange("2026-10", "2025-11-15", "2026-10-19")).toEqual(["2026-10-01", "2026-10-19"]);
  });
});
