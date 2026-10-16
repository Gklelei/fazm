import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { resetDb } from "@/tests/support/db";
import { activityFiltersFromParams, listActivity } from "@/features/audit-logs/queries/list";

const at = (iso: string, action: string, resource = "Invoice") =>
  db.auditLog.create({ data: { action, resource, details: action, createdAt: new Date(iso) } });
const run = (q: Record<string, string>) => listActivity(activityFiltersFromParams((k) => q[k]));
const actions = async (q: Record<string, string>) => (await run(q)).rows.map((r) => r.action);

describe("activity log filters", () => {
  beforeEach(resetDb);

  it("splits changes, views & downloads, and sign-ins", async () => {
    await at("2026-11-02T08:00:00Z", "UPDATE_INVOICE");
    await at("2026-11-02T09:00:00Z", "VIEW");
    await at("2026-11-02T10:00:00Z", "EXPORT");
    await at("2026-11-02T11:00:00Z", "LOGIN", "Session");
    await at("2026-11-02T12:00:00Z", "PASSWORD_CHANGE", "User");
    expect(await actions({})).toEqual(["UPDATE_INVOICE"]);
    expect(await actions({ kind: "access" })).toEqual(["EXPORT", "VIEW"]);
    expect(await actions({ kind: "security" })).toEqual(["PASSWORD_CHANGE", "LOGIN"]);
    expect((await run({ kind: "all" })).total).toBe(5);
    expect(await actions({ kind: "all", area: "people" })).toEqual(["PASSWORD_CHANGE", "LOGIN"]);
  });

  it("uses Nairobi days for dates", async () => {
    await at("2026-11-01T21:30:00Z", "UPDATE_INVOICE"); // 00:30 on 2 Nov in Nairobi
    await at("2026-11-01T20:30:00Z", "CREATE_INVOICES"); // 23:30 on 1 Nov in Nairobi
    expect(await actions({ from: "2026-11-02", to: "2026-11-02" })).toEqual(["UPDATE_INVOICE"]);
    expect(await actions({ to: "2026-11-01" })).toEqual(["CREATE_INVOICES"]);
  });

  it("pages by cursor without repeating or skipping", async () => {
    for (let i = 0; i < 120; i++) await at(new Date(Date.UTC(2026, 10, 2, 0, i)).toISOString(), "UPDATE_INVOICE");
    const f = activityFiltersFromParams(() => null);
    const p1 = await listActivity(f);
    const p2 = await listActivity(f, p1.nextCursor);
    const p3 = await listActivity(f, p2.nextCursor);
    const ids = [...p1.rows, ...p2.rows, ...p3.rows].map((r) => r.id);
    expect([p1.rows.length, p2.rows.length, p3.rows.length, p3.nextCursor]).toEqual([50, 50, 20, null]);
    expect(new Set(ids).size).toBe(120);
    expect(p1.total).toBe(120);
  });

  it("ignores unknown filter values", () => {
    expect(activityFiltersFromParams((k) => ({ kind: "bogus", area: "x", from: "02/11/2026" })[k as "kind"] ?? null)).toMatchObject({
      kind: "changes",
      area: "",
      from: "",
    });
  });
});
