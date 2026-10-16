import { describe, expect, it } from "vitest";
import { safeNext } from "@/features/auth/lib/safe-next";

describe("safeNext", () => {
  it.each(["/", "/athletes", "/invoices?status=PAID", "/finance/payments#top"])("keeps %s", (p) => {
    expect(safeNext(p)).toBe(p);
  });
  it.each([undefined, null, 42, ["/x"], "", "athletes", "//evil.example", "/\\evil.example", "https://evil.example", "/x\nSet-Cookie: a"])(
    "sends %s home",
    (p) => expect(safeNext(p)).toBe("/"),
  );
});
