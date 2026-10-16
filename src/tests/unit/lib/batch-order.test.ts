import { expect, it } from "vitest";
import { byBatchOrder } from "@/lib/batch-order";

it("orders batches by age, then named ones, Unassigned last", () => {
  const names = ["Senior", "U11", "Unassigned", "U13", "U7", "U17", "U9"].map((name) => ({ name }));
  expect(names.sort(byBatchOrder).map((b) => b.name)).toEqual(["U7", "U9", "U11", "U13", "U17", "Senior", "Unassigned"]);
});
