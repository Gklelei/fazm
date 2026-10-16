import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeBatch, makeLocation, resetDb, signedIn } from "@/tests/support/db";
import { signInAs } from "@/tests/support/session";
import { CreateTrainingSession } from "@/features/trainings/actions/create-session";
import { EditTrainingSessionAction } from "@/features/trainings/actions/edit-session";
import { DeleteTrainingSession } from "@/features/trainings/actions/delete-session";
import { NOT_YOUR_SESSION } from "@/features/trainings/lib/ownership";

const signBackIn = (u: { id: string; name: string; email: string; role: string }) => signInAs(u);

async function setup() {
  const mine = await signedIn("COACH");
  const other = await signedIn("COACH");
  const batch = await makeBatch();
  const pitch = await makeLocation();
  const drill = await db.drills.create({ data: { name: "Rondo", value: "RONDO" } });
  const theirs = await db.training.create({
    data: {
      batchesId: batch.id,
      date: new Date("2026-11-07T13:00:00Z"),
      name: "Their session",
      description: "x",
      duration: 60,
      trainingLocationsId: pitch.id,
      staffId: other.staff!.staffId,
    },
  });
  const form = (coach: string, date = "2026-11-09T13:00:00.000Z") => ({
    title: "Training",
    description: "Passing",
    date,
    duration: 60,
    location: pitch.id,
    drills: [drill.id],
    coach,
    batch: batch.id,
  });
  signBackIn(mine.user);
  return { mine, other, theirs, form };
}

describe("coaches manage only their own sessions", () => {
  beforeEach(resetDb);

  it("lets a coach plan a session for themselves, not for a colleague", async () => {
    const { mine, other, form } = await setup();
    expect((await CreateTrainingSession(form(mine.staff!.staffId))).success).toBe(true);
    expect(await CreateTrainingSession(form(other.staff!.staffId, "2026-11-10T13:00:00.000Z"))).toEqual({ success: false, message: NOT_YOUR_SESSION });
    expect(await db.training.count({ where: { staffId: other.staff!.staffId } })).toBe(1);
  });

  it("refuses editing or deleting a colleague's session", async () => {
    const { mine, theirs, form } = await setup();
    expect(await EditTrainingSessionAction(form(mine.staff!.staffId), theirs.id)).toEqual({ success: false, message: NOT_YOUR_SESSION });
    expect(await DeleteTrainingSession(theirs.id)).toEqual({ success: false, message: NOT_YOUR_SESSION });
    expect(await db.training.findUniqueOrThrow({ where: { id: theirs.id } })).toMatchObject({ name: "Their session", isArchived: false });
  });

  it("lets an admin manage anyone's session", async () => {
    const { theirs } = await setup();
    await signedIn("ADMIN");
    expect((await DeleteTrainingSession(theirs.id)).success).toBe(true);
  });
});
