import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeLocation, resetDb, signedIn } from "@/tests/support/db";
import {
  planSquadSessions,
  previewSquadSessions,
  saveSquad,
  saveTimetable,
  setSquadArchived,
} from "@/features/settings/actions/squads";

/** A Monday about three weeks out, so the tests never plan into the past. */
function futureMonday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 21 + ((8 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
}
const plusDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function squadWithTimetable() {
  const { staff } = await signedIn("COACH");
  const pitch = await makeLocation();
  const squad = await makeBatch("U13");
  await signedIn("ADMIN");
  const slot = { days: ["MONDAY", "WEDNESDAY"] as ("MONDAY" | "WEDNESDAY")[], time: "16:00", endTime: "17:30", trainingLocationsId: pitch.id, staffId: staff!.staffId };
  expect(await saveTimetable(squad.id, { slots: [slot] })).toMatchObject({ success: true });
  return { squad, pitch, staff: staff!, slot };
}

describe("squads", () => {
  beforeEach(resetDb);

  it("adds and renames a squad, refusing duplicate names", async () => {
    const { user } = await signedIn("ADMIN");
    expect(await saveSquad({ name: "U19" })).toMatchObject({ success: true });
    const squad = await db.batches.findFirstOrThrow({ where: { name: "U19" } });
    expect(await saveSquad({ name: "u19" })).toMatchObject({ success: false, message: 'There\'s already a squad called "u19".' });
    expect(await saveSquad({ name: "U19 Elite", description: "Top group" }, squad.id)).toMatchObject({ success: true });
    expect(await db.batches.findUniqueOrThrow({ where: { id: squad.id } })).toMatchObject({ name: "U19 Elite", description: "Top group" });
    expect(await db.auditLog.count({ where: { userId: user.id, batchId: squad.id } })).toBe(2);
  });

  it("won't archive a squad that still has athletes, and restores", async () => {
    await signedIn("ADMIN");
    const squad = await makeBatch("U9");
    await makeAthlete({ batchesId: squad.id });
    expect(await setSquadArchived(squad.id, true)).toMatchObject({ success: false, message: "U9 still has 1 athlete. Move them to another squad first." });

    const empty = await makeBatch("Old");
    expect(await setSquadArchived(empty.id, true)).toMatchObject({ success: true });
    expect((await db.batches.findUniqueOrThrow({ where: { id: empty.id } })).isArchived).toBe(true);
    expect(await setSquadArchived(empty.id, false)).toMatchObject({ success: true });
    expect((await db.batches.findUniqueOrThrow({ where: { id: empty.id } })).isArchived).toBe(false);
  });

  it("is admin only", async () => {
    const squad = await makeBatch();
    for (const role of ["COACH", "FINANCE"] as const) {
      await signedIn(role);
      expect((await saveSquad({ name: "X" })).success).toBe(false);
      expect((await setSquadArchived(squad.id, true)).success).toBe(false);
      expect((await saveTimetable(squad.id, { slots: [] })).success).toBe(false);
      expect((await planSquadSessions(squad.id, { from: futureMonday(), to: futureMonday() })).success).toBe(false);
    }
    expect(await db.batches.count()).toBe(1);
  });
});

describe("timetable and planning sessions", () => {
  beforeEach(resetDb);

  it("stores one row per day, and refuses overlapping slots", async () => {
    const { squad, slot } = await squadWithTimetable();
    const rows = await db.batchSchedule.findMany({ where: { batchId: squad.id }, orderBy: { dayOfWeek: "asc" } });
    expect(rows.map((r) => [r.dayOfWeek, r.time, r.endTime])).toEqual([
      ["MONDAY", "16:00", "17:30"],
      ["WEDNESDAY", "16:00", "17:30"],
    ]);
    const clash = await saveTimetable(squad.id, { slots: [slot, { ...slot, days: ["WEDNESDAY"], time: "17:00", endTime: "18:00" }] });
    expect(clash.success).toBe(false);
  });

  it("plans sessions in Nairobi time, with the squad's athletes on the register", async () => {
    const { squad, staff, pitch } = await squadWithTimetable();
    const a = await makeAthlete({ batchesId: squad.id });
    await makeAthlete({ batchesId: squad.id });
    await db.athlete.update({ where: { id: a.id }, data: { isArchived: true } }); // archived athletes stay off
    const from = futureMonday();
    const to = plusDays(from, 13); // two weeks: Mon, Wed, Mon, Wed

    const preview = await previewSquadSessions(squad.id, { from, to });
    expect("sessions" in preview && preview.sessions.length).toBe(4);

    expect(await planSquadSessions(squad.id, { from, to })).toMatchObject({ success: true, message: "4 sessions planned for U13." });
    const sessions = await db.training.findMany({ where: { batchesId: squad.id }, orderBy: { date: "asc" }, include: { athletes: true } });
    expect(sessions[0].date.toISOString()).toBe(`${from}T13:00:00.000Z`); // 16:00 in Nairobi
    expect(sessions.every((s) => s.duration === 90 && s.staffId === staff.staffId && s.trainingLocationsId === pitch.id)).toBe(true);
    expect(sessions.every((s) => s.athletes.length === 1)).toBe(true);
    expect(await db.auditLog.count({ where: { action: "PLAN_BATCH_SESSIONS" } })).toBe(1);

    // Running it again plans nothing new
    expect(await planSquadSessions(squad.id, { from, to })).toMatchObject({ success: false, message: "Nothing new to plan in those dates." });
    expect(await db.training.count()).toBe(4);
  });

  it("skips times when the coach is already with another squad", async () => {
    const { squad, staff, pitch } = await squadWithTimetable();
    const other = await makeBatch("U15");
    const from = futureMonday();
    await db.training.create({
      data: {
        batchesId: other.id,
        name: "U15 training",
        description: "x",
        date: new Date(`${from}T13:30:00Z`),
        duration: 60,
        staffId: staff.staffId,
        trainingLocationsId: pitch.id,
      },
    });
    const preview = await previewSquadSessions(squad.id, { from, to: plusDays(from, 2) });
    expect("sessions" in preview && preview.sessions.map((s) => s.skip)).toEqual(["coach busy", null]);
  });

  it("asks for a timetable before planning, and caps the range", async () => {
    await signedIn("ADMIN");
    const bare = await makeBatch("U7");
    expect(await planSquadSessions(bare.id, { from: futureMonday(), to: plusDays(futureMonday(), 6) })).toMatchObject({
      success: false,
      message: "Set U7's weekly timetable first.",
    });
    const res = await planSquadSessions(bare.id, { from: futureMonday(), to: plusDays(futureMonday(), 400) });
    expect(res.success).toBe(false);
  });
});
