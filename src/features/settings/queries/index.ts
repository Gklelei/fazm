import "server-only";

import { db } from "@/lib/prisma";
import { ROLE_GROUPS } from "@/lib/roles";
import { byBatchOrder } from "@/lib/batch-order";

const WEEK = 7 * 24 * 3_600_000;

/**
 * Everything the Settings page shows, archived items included (the page
 * hides them behind "Show archived"). Admin-only and rarely opened, so it
 * reads straight from the database rather than the lookup cache.
 */
export async function getSettingsData() {
  const now = new Date();
  const [programmes, batches, upcoming, pitches, drills, reasons, coaches, plans] = await Promise.all([
    db.programme.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        isArchived: true,
        batches: {
          where: { isArchived: false },
          select: { _count: { select: { athletes: { where: { isArchived: false } } } } },
        },
      },
    }),
    db.batches.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isArchived: true,
        programmeId: true,
        _count: { select: { athletes: { where: { isArchived: false } } } },
        schedules: {
          select: {
            dayOfWeek: true,
            time: true,
            endTime: true,
            location: { select: { id: true, name: true, voided: true } },
            coach: { select: { staffId: true, fullNames: true } },
          },
        },
      },
    }),
    db.training.groupBy({
      by: ["batchesId"],
      where: { date: { gte: now }, isArchived: false, status: { not: "CANCELLED" } },
      _min: { date: true },
      _max: { date: true },
      _count: true,
    }),
    db.trainingLocations.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, voided: true, _count: { select: { trainings: true } } },
    }),
    db.drills.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, voided: true, _count: { select: { trainings: true } } },
    }),
    db.tRAINING_ATTENDANCE_REASONS.findMany({
      orderBy: { label: "asc" },
      select: { id: true, status: true, label: true, isArchived: true, _count: { select: { attendances: true } } },
    }),
    db.staff.findMany({
      where: { user: { role: { in: [...ROLE_GROUPS.coaching] }, isArchived: false } },
      orderBy: { fullNames: "asc" },
      select: { staffId: true, fullNames: true },
    }),
    db.subscriptionPlan.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const next = new Map(upcoming.map((u) => [u.batchesId, u]));
  batches.sort(byBatchOrder);
  return {
    programmes: programmes.map((p) => ({
      id: p.id,
      name: p.name,
      archived: p.isArchived,
      batches: p.batches.length,
      athletes: p.batches.reduce((n, b) => n + b._count.athletes, 0),
      used: p.batches.length,
    })),
    batches: batches.map((s) => {
      const u = next.get(s.id);
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        archived: s.isArchived,
        programmeId: s.programmeId,
        athletes: s._count.athletes,
        slots: s.schedules,
        nextSession: u?._min.date ?? null,
        plannedUntil: u?._max.date ?? null,
        upcoming: u?._count ?? 0,
        quietWeek: !u?._min.date || u._min.date.getTime() - now.getTime() > WEEK,
      };
    }),
    pitches: pitches.map((p) => ({ id: p.id, name: p.name, archived: p.voided === 1, used: p._count.trainings })),
    drills: drills.map((d) => ({ id: d.id, name: d.name, description: d.description, archived: d.voided === 1, used: d._count.trainings })),
    reasons: reasons.map((r) => ({ id: r.id, status: r.status, label: r.label ?? "", archived: r.isArchived, used: r._count.attendances })),
    coaches,
    plans,
  };
}

export type SettingsData = Awaited<ReturnType<typeof getSettingsData>>;
