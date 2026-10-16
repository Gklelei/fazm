"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { academyInstant, formatAcademy, minutesBetween } from "@/lib/academy-time";
import { mayManageSession, NOT_YOUR_SESSION } from "@/features/trainings/lib/ownership";
import { sessionSchema, type SessionInput } from "@/features/trainings/schemas";

type Tx = Prisma.TransactionClient;

/** Start, length and the checked references for a session form. */
async function prepare(v: ReturnType<typeof sessionSchema.parse>) {
  const start = academyInstant(v.date, v.start);
  const duration = minutesBetween(v.start, v.end);
  const [batch, pitch, coach, drills] = await Promise.all([
    db.batches.findFirst({ where: { id: v.batch, isArchived: false }, select: { id: true, name: true } }),
    db.trainingLocations.findFirst({ where: { id: v.location, voided: 0 }, select: { id: true } }),
    db.staff.findFirst({ where: { staffId: v.coach, user: { isArchived: false } }, select: { staffId: true } }),
    db.drills.findMany({ where: { id: { in: v.drills }, voided: 0 }, select: { id: true } }),
  ]);
  if (!batch) throw new ActionError("That batch is no longer available. Choose another.");
  if (!pitch) throw new ActionError("That pitch is no longer available. Choose another.");
  if (!coach) throw new ActionError("That coach is no longer available. Choose another.");
  const known = new Set(drills.map((d) => d.id));
  return { start, duration, batch, drillIds: v.drills.filter((id) => known.has(id)) };
}

/**
 * Refuses a time that overlaps another session of the same batch, coach or
 * pitch (cancelled and deleted sessions don't count). Runs inside the
 * saving transaction, under a lock, so two saves can't both pass.
 */
async function assertFree(tx: Tx, v: { batch: string; coach: string; location: string }, start: Date, duration: number, exceptId?: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('training-slots'))`;
  const end = new Date(start.getTime() + duration * 60_000);
  const clash = await tx.$queryRaw<{ batchesId: string; staffId: string; trainingLocationsId: string; name: string }[]>`
    SELECT "batchesId", "staffId", "trainingLocationsId", name FROM training
    WHERE "isArchived" = false AND status <> 'CANCELLED'
      AND (${exceptId ?? null}::text IS NULL OR id <> ${exceptId ?? null})
      AND ("batchesId" = ${v.batch} OR "staffId" = ${v.coach} OR "trainingLocationsId" = ${v.location})
      AND (date, date + (duration || ' minutes')::interval) OVERLAPS (${start}, ${end})
    LIMIT 1`;
  const c = clash[0];
  if (!c) return;
  if (c.batchesId === v.batch) throw new ActionError("This batch already has a session at that time.");
  if (c.staffId === v.coach) throw new ActionError(`The coach is running "${c.name}" at that time.`);
  throw new ActionError(`The pitch is taken by "${c.name}" at that time.`);
}

export async function createSession(input: SessionInput) {
  return asRole("coaching", async (user) => {
    const v = sessionSchema.parse(input);
    if (!(await mayManageSession(user, v.coach))) throw new ActionError(NOT_YOUR_SESSION);
    const { start, duration, batch, drillIds } = await prepare(v);

    const created = await db.$transaction(async (tx) => {
      await assertFree(tx, v, start, duration);
      const athletes = await tx.athlete.findMany({ where: { batchesId: batch.id, isArchived: false }, select: { id: true } });
      return tx.training.create({
        data: {
          name: v.title,
          description: v.description,
          note: v.note || null,
          date: start,
          duration,
          batchesId: batch.id,
          trainingLocationsId: v.location,
          staffId: v.coach,
          drills: { connect: drillIds.map((id) => ({ id })) },
          drillOrder: drillIds,
          athletes: { connect: athletes },
        },
        select: { id: true },
      });
    });

    revalidatePath("/sessions");
    await createAuditLog({
      action: "CREATE_TRAINING_SESSION",
      resource: "TrainingSession",
      details: `Planned "${v.title}" for ${batch.name}, ${formatAcademy(start, { weekday: "short", day: "numeric", month: "short" })} ${v.start}–${v.end}`,
      userId: user.id,
      trainingId: created.id,
    });
    return { success: true as const, message: "Session planned.", id: created.id };
  });
}

export async function updateSession(id: string, input: SessionInput) {
  return asRole("coaching", async (user) => {
    const v = sessionSchema.parse(input);
    const before = await db.training.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        note: true,
        date: true,
        duration: true,
        batchesId: true,
        staffId: true,
        trainingLocationsId: true,
        drillOrder: true,
        isArchived: true,
        _count: { select: { attendances: true } },
      },
    });
    if (!before || before.isArchived) throw new ActionError("This session no longer exists.");
    // A coach edits only their own sessions, and can't hand one to another coach
    if (!(await mayManageSession(user, before.staffId)) || !(await mayManageSession(user, v.coach))) {
      throw new ActionError(NOT_YOUR_SESSION);
    }
    const batchChanged = v.batch !== before.batchesId;
    if (batchChanged && before._count.attendances) {
      throw new ActionError("Attendance is already taken for this session, so its batch can't change.");
    }
    const { start, duration, batch, drillIds } = await prepare(v);

    await db.$transaction(async (tx) => {
      await assertFree(tx, v, start, duration, id);
      const athletes = batchChanged
        ? await tx.athlete.findMany({ where: { batchesId: batch.id, isArchived: false }, select: { id: true } })
        : null;
      await tx.training.update({
        where: { id },
        data: {
          name: v.title,
          description: v.description,
          note: v.note || null,
          date: start,
          duration,
          batchesId: batch.id,
          trainingLocationsId: v.location,
          staffId: v.coach,
          drills: { set: drillIds.map((d) => ({ id: d })) },
          drillOrder: drillIds,
          // A new batch brings its own register
          ...(athletes && { athletes: { set: athletes } }),
        },
      });
    });

    revalidatePath("/sessions");
    revalidatePath(`/sessions/view/${id}`);
    await createAuditLog({
      action: "UPDATE_TRAINING_SESSION",
      resource: "TrainingSession",
      details: `Updated "${v.title}"`,
      userId: user.id,
      trainingId: id,
      changes: diffFields(
        {
          title: before.name,
          description: before.description,
          note: before.note ?? "",
          start: before.date.toISOString(),
          duration: before.duration,
          batch: before.batchesId,
          coach: before.staffId,
          pitch: before.trainingLocationsId,
          drills: before.drillOrder,
        },
        {
          title: v.title,
          description: v.description,
          note: v.note,
          start: start.toISOString(),
          duration,
          batch: v.batch,
          coach: v.coach,
          pitch: v.location,
          drills: drillIds,
        },
      ),
    });
    return { success: true as const, message: "Session updated.", id };
  });
}
