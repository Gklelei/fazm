import { describe, expect, it } from "vitest";
import { academyInstant, academyToday } from "@/lib/academy-time";
import { planSessions, type Slot } from "@/features/settings/lib/plan-sessions";

const slot = (over: Partial<Slot> = {}): Slot => ({
  dayOfWeek: "MONDAY",
  time: "16:00",
  endTime: "17:30",
  trainingLocationsId: "pitch-1",
  staffId: "STF-1",
  ...over,
});

describe("academy time", () => {
  it("stores 16:00 in Nairobi as 13:00 UTC", () => {
    expect(academyInstant("2026-11-02", "16:00").toISOString()).toBe("2026-11-02T13:00:00.000Z");
  });
  it("early morning stays on the right day", () => {
    expect(academyInstant("2026-11-02", "01:30").toISOString()).toBe("2026-11-01T22:30:00.000Z");
  });
  it("knows today in Nairobi near midnight UTC", () => {
    expect(academyToday(new Date("2026-11-01T22:00:00Z"))).toBe("2026-11-02");
  });
});

describe("planSessions", () => {
  // 2026-11-02 is a Monday
  it("makes one session per matching day, inclusive of both ends", () => {
    const out = planSessions("b1", [slot()], "2026-11-02", "2026-11-16", []);
    expect(out.map((p) => p.date.toISOString())).toEqual([
      "2026-11-02T13:00:00.000Z",
      "2026-11-09T13:00:00.000Z",
      "2026-11-16T13:00:00.000Z",
    ]);
    expect(out.every((p) => p.duration === 90 && p.skip === null)).toBe(true);
  });

  it("starts from the first matching day after the start date", () => {
    const out = planSessions("b1", [slot({ dayOfWeek: "SUNDAY" })], "2026-11-02", "2026-11-09", []);
    expect(out.map((p) => p.date.toISOString())).toEqual(["2026-11-08T13:00:00.000Z"]);
  });

  it("sorts several slots by time", () => {
    const out = planSessions("b1", [slot({ dayOfWeek: "WEDNESDAY" }), slot()], "2026-11-02", "2026-11-08", []);
    expect(out.map((p) => p.date.getUTCDate())).toEqual([2, 4]);
  });

  it("skips what the batch already has, and clashes for the coach or pitch", () => {
    const at = (h: number) => new Date(Date.UTC(2026, 10, 2, h));
    const busy = (batchesId: string, staffId: string, trainingLocationsId: string, d: Date) => ({
      start: d,
      end: new Date(d.getTime() + 60 * 60_000),
      batchesId,
      staffId,
      trainingLocationsId,
    });
    const plan = (b: ReturnType<typeof busy>) => planSessions("b1", [slot()], "2026-11-02", "2026-11-02", [b])[0].skip;
    expect(plan(busy("b1", "x", "y", at(13)))).toBe("already planned");
    expect(plan(busy("b2", "STF-1", "y", at(14)))).toBe("coach busy");
    expect(plan(busy("b2", "x", "pitch-1", at(12) /* ends 13:00, touching only */))).toBe(null);
    expect(plan(busy("b2", "x", "pitch-1", at(13)))).toBe("pitch busy");
  });

  it("doesn't let overlapping slots of one run double-book the batch", () => {
    const out = planSessions("b1", [slot(), slot({ time: "17:00", endTime: "18:00", trainingLocationsId: "pitch-2" })], "2026-11-02", "2026-11-02", []);
    expect(out.map((p) => p.skip)).toEqual([null, "already planned"]);
  });

  it("ignores slots whose end isn't after the start", () => {
    expect(planSessions("b1", [slot({ endTime: "16:00" })], "2026-11-02", "2026-11-30", [])).toEqual([]);
  });
});

describe("formatAcademy", () => {
  it("shows Nairobi time", async () => {
    const { formatAcademy } = await import("@/lib/academy-time");
    expect(formatAcademy("2026-11-02T13:00:00Z", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })).toBe("16:00");
  });
});
