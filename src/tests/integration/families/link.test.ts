import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, resetDb, signedIn } from "@/tests/support/db";
import { linkSiblings, unlinkSibling } from "@/features/families/actions/link";
import { familyOf } from "@/features/families/queries";

const familyIds = async (...ids: string[]) =>
  (await db.athlete.findMany({ where: { athleteId: { in: ids } }, select: { athleteId: true, familyId: true }, orderBy: { athleteId: "asc" } })).map((a) => a.familyId);

describe("families", () => {
  beforeEach(resetDb);

  it("suggests athletes whose guardian has the same mobile, however it was typed", async () => {
    await signedIn("FINANCE");
    const [a, b, c] = await Promise.all([makeAthlete(), makeAthlete(), makeAthlete()]);
    const g = (athleteId: string, phoneNumber: string) => db.athleteGuardian.create({ data: { athleteId, fullNames: "Parent", relationship: "Mother", email: "", phoneNumber } });
    await Promise.all([g(a.athleteId, "0711872468"), g(b.athleteId, "+254 711 872 468"), g(c.athleteId, "0123456789")]);

    expect((await familyOf(a.athleteId))!.suggestions.map((s) => s.athleteId)).toEqual([b.athleteId]);
  });

  it("links, merges families and removes a family left with one child", async () => {
    await signedIn("FINANCE");
    const [a, b, c, d] = await Promise.all([makeAthlete(), makeAthlete(), makeAthlete(), makeAthlete()]);

    expect((await linkSiblings(a.athleteId, b.athleteId)).success).toBe(true);
    expect((await linkSiblings(c.athleteId, d.athleteId)).success).toBe(true);
    await linkSiblings(b.athleteId, c.athleteId);
    const ids = await familyIds(a.athleteId, b.athleteId, c.athleteId, d.athleteId);
    expect(new Set(ids).size).toBe(1);
    expect(await db.family.count()).toBe(1);

    await unlinkSibling(a.athleteId);
    await unlinkSibling(b.athleteId);
    await unlinkSibling(c.athleteId);
    expect(await familyIds(d.athleteId)).toEqual([null]);
    expect(await db.family.count()).toBe(0);
  });

  it("is for finance roles only", async () => {
    await signedIn("COACH");
    const [a, b] = await Promise.all([makeAthlete(), makeAthlete()]);
    expect((await linkSiblings(a.athleteId, b.athleteId)).success).toBe(false);
  });
});
