import { beforeEach, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, resetDb } from "@/tests/support/db";
import { resolveAthleteId } from "@/features/athletes/lib/athlete-ref";
import { athleteSlug } from "@/features/athletes/lib/athlete-links";

beforeEach(resetDb);

it("finds an athlete from a link, the record id, or the ID they had before", async () => {
  const a = await makeAthlete();
  await db.athlete.update({ where: { id: a.id }, data: { athleteId: "ATH/FFA/M/501", formerAthleteId: "ATH-FFA-501" } });

  expect(await resolveAthleteId("ATH/FFA/M/501")).toBe("ATH/FFA/M/501");
  expect(await resolveAthleteId(athleteSlug("ATH/FFA/M/501"))).toBe("ATH/FFA/M/501");
  expect(await resolveAthleteId("ATH%2FFFA%2FM%2F501")).toBe("ATH/FFA/M/501");
  expect(await resolveAthleteId(a.id)).toBe("ATH/FFA/M/501");
  expect(await resolveAthleteId("ATH-FFA-501")).toBe("ATH/FFA/M/501");
});

it("finds today's dashed IDs, and nothing for an unknown one", async () => {
  const a = await makeAthlete();
  expect(await resolveAthleteId(a.athleteId)).toBe(a.athleteId);
  expect(await resolveAthleteId("ATH-FFA-999")).toBeNull();
  expect(await resolveAthleteId("100%")).toBeNull();
  expect(await resolveAthleteId(undefined)).toBeNull();
});
