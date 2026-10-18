import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/audit-logs/actions/log-export", () => ({ logExport: async () => {} }));
const { excelCell } = await import("@/lib/export");

describe("Excel cells", () => {
  it("keeps money and numbers as numbers", () => {
    expect(excelCell("KES 1,500")).toEqual({ v: 1500, money: true });
    expect(excelCell("Ksh 92,000.50")).toEqual({ v: 92000.5, money: true });
    expect(excelCell("12")).toEqual({ v: 12 });
    expect(excelCell("1,234")).toEqual({ v: 1234 });
    expect(excelCell("0")).toEqual({ v: 0 });
  });

  it("keeps phone numbers, IDs and dates as text", () => {
    for (const t of ["0712345678", "+254712345678", "0722 111 222", "ATH-FFA-501", "INV-20261016-023", "2026-10-18", "18 Oct 2026", "123456789012"]) {
      expect(excelCell(t)).toEqual({ v: t });
    }
  });
});
