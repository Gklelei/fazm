import { describe, expect, it } from "vitest";
import { allocateOldestFirst } from "@/features/families/lib/allocate";

describe("family payment split", () => {
  const open = [
    { invoiceNumber: "A", balance: 3000 },
    { invoiceNumber: "B", balance: 1500.5 },
    { invoiceNumber: "C", balance: 2000 },
  ];
  it("pays the oldest first", () => {
    expect(allocateOldestFirst(4000, open)).toEqual({ split: { A: 3000, B: 1000, C: 0 }, unallocated: 0 });
  });
  it("keeps cents exact and reports what's left over", () => {
    expect(allocateOldestFirst(7000.75, open)).toEqual({ split: { A: 3000, B: 1500.5, C: 2000 }, unallocated: 500.25 });
  });
});
