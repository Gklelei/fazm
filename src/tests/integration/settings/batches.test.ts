import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeLocation, makeProgramme, resetDb, signedIn } from "@/tests/support/db";
import {
  planBatchSessions,
  previewBatchSessions,
  saveBatch,
  saveTimetable,
  setBatchArchived,
} from "@/features/settings/actions/batches";

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

async function batchWithTimetable() {
  const { staff } = await signedIn("COACH");
  const pitch = await makeLocation();
  const batch = await makeBatch("U13");
  await signedIn("ADMIN");
  const slot = { days: ["MONDAY", "WEDNESDAY"] as ("MONDAY" | "WEDNESDAY")[], time: "16:00", endTime: "17:30", trainingLocationsId: pitch.id, staffId: staff!.staffId };
  expect(await saveTimetable(batch.id, { slots: [slot] })).toMatchObject({ success: true });
  return { batch, pitch, staff: staff!, slot };
}

describe("batches", () => {
  beforeEach(resetDb);

  it("adds and renames a batch, refusing duplicate names within a programme", async () => {
    const { user } = await signedIn("ADMIN");
    const boys = await makeProgramme("Boys");
    const girls = await makeProgramme("Girls");
    expect(await saveBatch({ name: "U19", programmeId: boys.id })).toMatchObject({ success: true });
    const batch = await db.batches.findFirstOrThrow({ where: { name: "U19" } });
    expect(await saveBatch({ name: "u19", programmeId: boys.id })).toMatchObject({ success: false, message: 'Boys already has a batch called "u19".' });
    // Same name in another programme is fine
    expect(await saveBatch({ name: "U19", programmeId: girls.id })).toMatchObject({ success: true });
    expect(await saveBatch({ name: "U19 Elite", description: "Top group", programmeId: boys.id }, batch.id)).toMatchObject({ success: true });
    expect(await db.batches.findUniqueOrThrow({ where: { id: batch.id } })).toMatchObject({ name: "U19 Elite", description: "Top group" });
    expect(await db.auditLog.count({ where: { userId: user.id, batchId: batch.id } })).toBe(2);
  });

  it("moves a batch to another programme, and refuses an archived one", async () => {
    await signedIn("ADMIN");
    const batch = await makeBatch("U13");
    const girls = await makeProgramme("Girls");
    expect(await saveBatch({ name: "U13", programmeId: girls.id }, batch.id)).toMatchObject({ success: true });
    expect((await db.batches.findUniqueOrThrow({ where: { id: batch.id } })).programmeId).toBe(girls.id);
    expect(await db.auditLog.findFirst({ where: { batchId: batch.id }, select: { details: true } })).toMatchObject({
      details: 'Updated batch "U13", moved to Girls',
    });

    const old = await db.programme.create({ data: { name: "Old", isArchived: true } });
    expect(await saveBatch({ name: "U13", programmeId: old.id }, batch.id)).toMatchObject({
      success: false,
      message: "Pick a programme that's in use.",
    });
  });

  it("won't archive a batch that still has athletes, and restores", async () => {
    await signedIn("ADMIN");
    const batch = await makeBatch("U9");
    await makeAthlete({ batchesId: batch.id });
    expect(await setBatchArchived(batch.id, true)).toMatchObject({ success: false, message: "U9 still has 1 athlete. Move them to another batch first." });

    const empty = await makeBatch("Old");
    expect(await setBatchArchived(empty.id, true)).toMatchObject({ success: true });
    expect((await db.batches.findUniqueOrThrow({ where: { id: empty.id } })).isArchived).toBe(true);
    expect(await setBatchArchived(empty.id, false)).toMatchObject({ success: true });
    expect((await db.batches.findUniqueOrThrow({ where: { id: empty.id } })).isArchived).toBe(false);
  });

  it("is admin only", async () => {
    const batch = await makeBatch();
    for (const role of ["COACH", "FINANCE"] as const) {
      await signedIn(role);
      expect((await saveBatch({ name: "X", programmeId: batch.programmeId })).success).toBe(false);
      expect((await setBatchArchived(batch.id, true)).success).toBe(false);
      expect((await saveTimetable(batch.id, { slots: [] })).success).toBe(false);
      expect((await planBatchSessions(batch.id, { from: futureMonday(), to: futureMonday() })).success).toBe(false);
    }
    expect(await db.batches.count()).toBe(1);
  });
});

describe("timetable and planning sessions", () => {
  beforeEach(resetDb);

  it("stores one row per day, and refuses overlapping slots", async () => {
    const { batch, slot } = await batchWithTimetable();
    const rows = await db.batchSchedule.findMany({ where: { batchId: batch.id }, orderBy: { dayOfWeek: "asc" } });
    expect(rows.map((r) => [r.dayOfWeek, r.time, r.endTime])).toEqual([
      ["MONDAY", "16:00", "17:30"],
      ["WEDNESDAY", "16:00", "17:30"],
    ]);
    const clash = await saveTimetable(batch.id, { slots: [slot, { ...slot, days: ["WEDNESDAY"], time: "17:00", endTime: "18:00" }] });
    expect(clash.success).toBe(false);
  });

  it("plans sessions in Nairobi time, with the batch's athletes on the register", async () => {
    const { batch, staff, pitch } = await batchWithTimetable();
    const a = await makeAthlete({ batchesId: batch.id });
    await makeAthlete({ batchesId: batch.id });
    await db.athlete.update({ where: { id: a.id }, data: { isArchived: true } }); // archived athletes stay off
    const from = futureMonday();
    const to = plusDays(from, 13); // two weeks: Mon, Wed, Mon, Wed

    const preview = await previewBatchSessions(batch.id, { from, to });
    expect("sessions" in preview && preview.sessions.length).toBe(4);

    expect(await planBatchSessions(batch.id, { from, to })).toMatchObject({ success: true, message: "4 sessions planned for U13." });
    const sessions = await db.training.findMany({ where: { batchesId: batch.id }, orderBy: { date: "asc" }, include: { athletes: true } });
    expect(sessions[0].date.toISOString()).toBe(`${from}T13:00:00.000Z`); // 16:00 in Nairobi
    expect(sessions.every((s) => s.duration === 90 && s.staffId === staff.staffId && s.trainingLocationsId === pitch.id)).toBe(true);
    expect(sessions.every((s) => s.athletes.length === 1)).toBe(true);
    expect(await db.auditLog.count({ where: { action: "PLAN_BATCH_SESSIONS" } })).toBe(1);

    // Running it again plans nothing new
    expect(await planBatchSessions(batch.id, { from, to })).toMatchObject({ success: false, message: "Nothing new to plan in those dates." });
    expect(await db.training.count()).toBe(4);
  });

  it("skips times when the coach is already with another batch", async () => {
    const { batch, staff, pitch } = await batchWithTimetable();
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
    const preview = await previewBatchSessions(batch.id, { from, to: plusDays(from, 2) });
    expect("sessions" in preview && preview.sessions.map((s) => s.skip)).toEqual(["coach busy", null]);
  });

  it("asks for a timetable before planning, and caps the range", async () => {
    await signedIn("ADMIN");
    const bare = await makeBatch("U7");
    expect(await planBatchSessions(bare.id, { from: futureMonday(), to: plusDays(futureMonday(), 6) })).toMatchObject({
      success: false,
      message: "Set U7's weekly timetable first.",
    });
    const res = await planBatchSessions(bare.id, { from: futureMonday(), to: plusDays(futureMonday(), 400) });
    expect(res.success).toBe(false);
  });
});
