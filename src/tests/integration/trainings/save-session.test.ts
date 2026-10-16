import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeLocation, resetDb, signedIn } from "@/tests/support/db";
import { createSession, updateSession } from "@/features/trainings/actions/save-session";
import type { SessionInput } from "@/features/trainings/schemas";
import { academyDate, academyHHmm } from "@/lib/academy-time";

async function setup() {
  const { staff } = await signedIn("COACH");
  const [batch, other, pitch] = await Promise.all([makeBatch("U13"), makeBatch("U15"), makeLocation()]);
  await makeAthlete({ batchesId: batch.id });
  await makeAthlete({ batchesId: batch.id });
  await makeAthlete({ batchesId: other.id });
  await signedIn("ADMIN");
  const form = (over: Partial<SessionInput> = {}): SessionInput => ({
    date: "2026-11-09",
    start: "16:00",
    end: "17:30",
    batch: batch.id,
    location: pitch.id,
    coach: staff!.staffId,
    title: "U13 training",
    description: "",
    drills: [],
    note: "",
    ...over,
  });
  return { batch, other, pitch, coach: staff!, form };
}

describe("planning and editing a session", () => {
  beforeEach(resetDb);

  it("saves the time as Nairobi time, without drills, with the batch on the register", async () => {
    const { form } = await setup();
    const res = await createSession(form());
    expect(res).toMatchObject({ success: true });
    const t = await db.training.findFirstOrThrow({ include: { athletes: true } });
    expect(t.date.toISOString()).toBe("2026-11-09T13:00:00.000Z");
    expect(t.duration).toBe(90);
    expect(t.athletes).toHaveLength(2);
  });

  it("keeps the time when edited without changing it", async () => {
    const { form } = await setup();
    const { id } = (await createSession(form())) as { id: string };
    const t = await db.training.findUniqueOrThrow({ where: { id } });
    // What the edit page puts in the form
    const reopened = form({ date: academyDate(t.date), start: academyHHmm(t.date), title: "Renamed" });
    expect((await updateSession(id, reopened)).success).toBe(true);
    expect((await db.training.findUniqueOrThrow({ where: { id } })).date.toISOString()).toBe("2026-11-09T13:00:00.000Z");
  });

  it("refuses a time when the batch, coach or pitch is busy", async () => {
    const { form, other } = await setup();
    await createSession(form());
    expect(await createSession(form({ start: "17:00", end: "18:00" }))).toMatchObject({ success: false, message: "This batch already has a session at that time." });
    expect((await createSession(form({ batch: other.id, start: "17:00", end: "18:00" }))).message).toMatch(/^The coach is running/);
    expect((await createSession(form({ start: "17:30", end: "18:30" }))).success).toBe(true); // back to back is fine
  });

  it("moves the register with the batch, unless attendance is taken", async () => {
    const { form, other } = await setup();
    const { id } = (await createSession(form())) as { id: string };
    expect((await updateSession(id, form({ batch: other.id }))).success).toBe(true);
    expect((await db.training.findUniqueOrThrow({ where: { id }, include: { athletes: true } })).athletes).toHaveLength(1);

    const t = await db.training.findUniqueOrThrow({ where: { id }, include: { athletes: true } });
    await db.attendance.create({ data: { trainingId: id, athleteId: t.athletes[0].athleteId, coachId: t.staffId, status: "PRESENT" } });
    expect(await updateSession(id, form())).toMatchObject({
      success: false,
      message: "Attendance is already taken for this session, so its batch can't change.",
    });
  });

  it("logs what changed", async () => {
    const { form } = await setup();
    const { id } = (await createSession(form())) as { id: string };
    await updateSession(id, form({ end: "18:00" }));
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "UPDATE_TRAINING_SESSION" } });
    expect(log.changes).toEqual({ before: { duration: 90 }, after: { duration: 120 } });
  });
});
