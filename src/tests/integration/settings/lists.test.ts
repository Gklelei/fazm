import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { resetDb, signedIn } from "@/tests/support/db";
import { saveDrill, savePitch, saveReason, setDrillArchived, setPitchArchived, setReasonArchived } from "@/features/settings/actions/lists";

describe("pitches, drills and attendance reasons", () => {
  beforeEach(resetDb);

  it("adds, renames, archives and restores a pitch, with no duplicate names", async () => {
    await signedIn("ADMIN");
    expect(await savePitch({ name: "Main pitch" })).toMatchObject({ success: true });
    expect(await savePitch({ name: "main  pitch" })).toMatchObject({ success: false });
    const pitch = await db.trainingLocations.findFirstOrThrow();
    expect(await savePitch({ name: "Eastleigh main pitch" }, pitch.id)).toMatchObject({ success: true });
    expect(await setPitchArchived(pitch.id, true)).toMatchObject({ success: true });
    expect((await db.trainingLocations.findUniqueOrThrow({ where: { id: pitch.id } })).voided).toBe(1);

    // A new pitch may reuse the archived name; restoring the old one is then refused
    expect(await savePitch({ name: "Eastleigh main pitch" })).toMatchObject({ success: true });
    expect(await setPitchArchived(pitch.id, false)).toMatchObject({ success: false });
    expect(await db.auditLog.count({ where: { resource: "TrainingLocation" } })).toBe(4);
  });

  it("keeps a drill's description and archives it", async () => {
    await signedIn("ADMIN");
    await saveDrill({ name: "Rondo 4v1", description: "Keep the ball in a 10 m square" });
    const drill = await db.drills.findFirstOrThrow();
    expect(drill).toMatchObject({ name: "Rondo 4v1", value: "RONDO_4V1", description: "Keep the ball in a 10 m square" });
    expect(await setDrillArchived(drill.id, true)).toMatchObject({ success: true, message: "Rondo 4v1 archived." });
  });

  it("allows the same reason under different statuses only", async () => {
    await signedIn("ADMIN");
    expect(await saveReason({ status: "ABSENT", label: "Travel" })).toMatchObject({ success: true });
    expect(await saveReason({ status: "LATE", label: "Travel" })).toMatchObject({ success: true });
    expect(await saveReason({ status: "ABSENT", label: "travel" })).toMatchObject({ success: false });
    const reason = await db.tRAINING_ATTENDANCE_REASONS.findFirstOrThrow({ where: { status: "ABSENT" } });
    expect(await setReasonArchived(reason.id, true)).toMatchObject({ success: true });
    expect((await db.tRAINING_ATTENDANCE_REASONS.findUniqueOrThrow({ where: { id: reason.id } })).isArchived).toBe(true);
  });

  it("is admin only", async () => {
    await signedIn("COACH");
    expect((await savePitch({ name: "X" })).success).toBe(false);
    expect((await saveDrill({ name: "X" })).success).toBe(false);
    expect((await saveReason({ status: "ABSENT", label: "X" })).success).toBe(false);
    expect(await db.trainingLocations.count()).toBe(0);
  });
});
