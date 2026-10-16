import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/prisma";
import { makeLocation, resetDb, signedIn } from "@/test/db";
import { CreateBatchWithSchedule } from "./batches";

async function batchInput() {
  const { staff } = await signedIn("COACH");
  const location = await makeLocation();
  return {
    name: "U12 Weekend",
    // Monday 2 Nov to Sunday 15 Nov 2026: two of each weekday
    startDate: new Date("2026-11-02T00:00:00Z"),
    endDate: new Date("2026-11-15T00:00:00Z"),
    trainingLocationsId: location.id,
    staffId: staff!.staffId,
    sessions: [{ days: ["SATURDAY", "SUNDAY"] as ("SATURDAY" | "SUNDAY")[], startTime: "16:00", endTime: "17:30" }],
  };
}

describe("creating a batch with a weekly schedule", () => {
  beforeEach(resetDb);

  it("creates the batch, its schedule and one session per scheduled day in the range", async () => {
    const input = await batchInput();
    await signedIn("ADMIN");

    const res = await CreateBatchWithSchedule(input);

    expect(res).toMatchObject({ success: true, message: "Batch created with 4 sessions" });
    const batch = await db.batches.findFirstOrThrow({ include: { schedules: true, sessions: { orderBy: { date: "asc" } } } });
    expect(batch.schedules.map((s) => s.dayOfWeek).sort()).toEqual(["SATURDAY", "SUNDAY"]);
    expect(batch.sessions.map((s) => s.date.toISOString())).toEqual([
      // Current behaviour: the time typed is stored as UTC (16:00Z = 19:00 in Nairobi). See the plan.
      "2026-11-07T16:00:00.000Z",
      "2026-11-08T16:00:00.000Z",
      "2026-11-14T16:00:00.000Z",
      "2026-11-15T16:00:00.000Z",
    ]);
    expect(batch.sessions.every((s) => s.duration === 90 && s.status === "SCHEDULED")).toBe(true);
  });

  it("doesn't create the same session twice when a day is listed twice", async () => {
    const input = await batchInput();
    await signedIn("ADMIN");
    input.sessions.push({ ...input.sessions[0], days: ["SATURDAY"] });

    await CreateBatchWithSchedule(input);

    expect(await db.training.count()).toBe(4);
  });

  it("is refused for coaches and finance", async () => {
    const input = await batchInput(); // signed in as a coach
    expect((await CreateBatchWithSchedule(input)).success).toBe(false);
    await signedIn("FINANCE");
    expect((await CreateBatchWithSchedule(input)).success).toBe(false);
    expect(await db.batches.count()).toBe(0);
  });
});
