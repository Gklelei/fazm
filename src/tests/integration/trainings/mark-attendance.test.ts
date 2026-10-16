import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeAthlete, makeBatch, makeLocation, resetDb, signedIn } from "@/tests/support/db";
import { saveAttendance } from "@/features/trainings/actions/mark-attendance";

async function session() {
  const coach = await signedIn("COACH");
  const batch = await makeBatch();
  const [a, b] = await Promise.all([makeAthlete({ batchesId: batch.id }), makeAthlete({ batchesId: batch.id })]);
  const outsider = await makeAthlete();
  const reason = await db.tRAINING_ATTENDANCE_REASONS.create({ data: { status: "ABSENT", label: "Sick" } });
  const training = await db.training.create({
    data: {
      batchesId: batch.id,
      date: new Date("2026-11-07T13:00:00Z"),
      name: "U12 Training",
      description: "Saturday",
      duration: 90,
      trainingLocationsId: (await makeLocation()).id,
      staffId: coach.staff!.staffId,
      athletes: { connect: [{ athleteId: a.athleteId }, { athleteId: b.athleteId }] },
    },
  });
  return { coach, a, b, outsider, reason, training };
}

describe("marking attendance", () => {
  beforeEach(resetDb);

  it("lets the session's coach mark the squad, and logs it", async () => {
    const { coach, a, b, reason, training } = await session();

    const res = await saveAttendance(
      [
        { athleteId: a.athleteId, status: "PRESENT", reasonId: reason.id },
        { athleteId: b.athleteId, status: "ABSENT", reasonId: reason.id },
      ],
      training.id,
    );

    expect(res.success).toBe(true);
    const marks = await db.attendance.findMany({ orderBy: { athleteId: "asc" } });
    expect(marks.map((m) => [m.status, m.reasonId])).toEqual([
      ["PRESENT", null], // a reason is dropped when present
      ["ABSENT", reason.id],
    ]);
    expect(await db.auditLog.count({ where: { action: "MARK_ATTENDANCE", userId: coach.user.id } })).toBe(1);
  });

  it("updates a mark instead of adding a second one", async () => {
    const { a, training } = await session();
    await saveAttendance([{ athleteId: a.athleteId, status: "ABSENT", reasonId: null }], training.id);
    await saveAttendance([{ athleteId: a.athleteId, status: "LATE", reasonId: null }], training.id);

    const marks = await db.attendance.findMany();
    expect(marks.map((m) => m.status)).toEqual(["LATE"]);
  });

  it("refuses athletes not on the session's register", async () => {
    const { outsider, training } = await session();
    const res = await saveAttendance([{ athleteId: outsider.athleteId, status: "PRESENT", reasonId: null }], training.id);
    expect(res.success).toBe(false);
    expect(await db.attendance.count()).toBe(0);
  });

  it("refuses a coach who doesn't run the session; admins may", async () => {
    const { a, training } = await session();
    await signedIn("COACH");
    expect((await saveAttendance([{ athleteId: a.athleteId, status: "PRESENT", reasonId: null }], training.id)).success).toBe(false);
    await signedIn("ADMIN");
    expect((await saveAttendance([{ athleteId: a.athleteId, status: "PRESENT", reasonId: null }], training.id)).success).toBe(true);
  });
});
