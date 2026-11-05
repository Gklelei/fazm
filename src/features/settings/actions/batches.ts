"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { academyInstant, formatAcademy } from "@/lib/academy-time";

const DAY = { day: "numeric", month: "short" } as const;
import { planSessions, type Slot } from "@/features/settings/lib/plan-sessions";
import {
  planSchema,
  batchSchema,
  timetableSchema,
  type PlanInput,
  type BatchInput,
  type TimetableInput,
} from "@/features/settings/schemas";

function changed() {
  lookupsChanged(LOOKUP.batches);
  revalidatePath("/settings");
}

async function findBatch(id: string) {
  const batch = await db.batches.findUnique({ where: { id }, select: { id: true, name: true, isArchived: true, programmeId: true } });
  if (!batch) throw new ActionError("That batch no longer exists.");
  return batch;
}

/** Names repeat across programmes (Boys U13, Girls U13), not within one. */
async function assertNameFree(name: string, programmeId: string, exceptId?: string) {
  const clash = await db.batches.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      programmeId,
      isArchived: false,
      NOT: exceptId ? { id: exceptId } : undefined,
    },
    select: { programme: { select: { name: true } } },
  });
  if (clash) throw new ActionError(`${clash.programme.name} already has a batch called "${name}".`);
}

async function findProgramme(id: string) {
  const programme = await db.programme.findUnique({ where: { id }, select: { id: true, name: true, isArchived: true } });
  if (!programme || programme.isArchived) throw new ActionError("Pick a programme that's in use.");
  return programme;
}

export async function saveBatch(input: BatchInput, id?: string) {
  return asRole("admin", async (user) => {
    const data = batchSchema.parse(input);
    const programme = await findProgramme(data.programmeId);
    await assertNameFree(data.name, programme.id, id);
    const before = id ? await findBatch(id) : null;
    const fields = { name: data.name, description: data.description || null, programmeId: programme.id };
    const batch = id
      ? await db.batches.update({ where: { id }, data: fields })
      : await db.batches.create({ data: fields });
    const moved = before && before.programmeId !== programme.id ? `, moved to ${programme.name}` : "";
    await createAuditLog({
      action: id ? "UPDATE_BATCH" : "CREATE_BATCH",
      resource: "Batch",
      details: id ? `Updated batch "${batch.name}"${moved}` : `Created ${programme.name} batch "${batch.name}"`,
      userId: user.id,
      batchId: batch.id,
    });
    changed();
    return { success: true, message: id ? "Batch updated." : `Batch "${batch.name}" added.` };
  });
}

export async function setBatchArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const batch = await findBatch(id);
    if (archived) {
      const active = await db.athlete.count({ where: { batchesId: id, isArchived: false } });
      if (active) {
        throw new ActionError(
          `${batch.name} still has ${active} athlete${active === 1 ? "" : "s"}. Move them to another batch first.`,
        );
      }
    } else {
      await assertNameFree(batch.name, batch.programmeId, id);
    }
    await db.batches.update({ where: { id }, data: { isArchived: archived } });
    await createAuditLog({
      action: archived ? "ARCHIVE_BATCH" : "RESTORE_BATCH",
      resource: "Batch",
      details: `${archived ? "Archived" : "Restored"} batch "${batch.name}"`,
      userId: user.id,
      batchId: id,
    });
    changed();
    return { success: true, message: archived ? `${batch.name} archived.` : `${batch.name} restored.` };
  });
}

/** Replaces the batch's weekly timetable. Sessions already planned are left as they are. */
export async function saveTimetable(id: string, input: TimetableInput) {
  return asRole("admin", async (user) => {
    const batch = await findBatch(id);
    if (batch.isArchived) throw new ActionError("Restore the batch before changing its timetable.");
    const { slots } = timetableSchema.parse(input);

    const [pitches, coaches] = await Promise.all([
      db.trainingLocations.count({ where: { id: { in: [...new Set(slots.map((s) => s.trainingLocationsId))] }, voided: 0 } }),
      db.staff.count({ where: { staffId: { in: [...new Set(slots.map((s) => s.staffId))] }, user: { isArchived: false } } }),
    ]);
    if (pitches !== new Set(slots.map((s) => s.trainingLocationsId)).size) throw new ActionError("One of the pitches was archived. Pick another.");
    if (coaches !== new Set(slots.map((s) => s.staffId)).size) throw new ActionError("One of the coaches is no longer active. Pick another.");

    const rows = slots.flatMap((s) =>
      s.days.map((dayOfWeek) => ({
        batchId: id,
        dayOfWeek,
        time: s.time,
        endTime: s.endTime,
        trainingLocationsId: s.trainingLocationsId,
        staffId: s.staffId,
      })),
    );
    await db.$transaction([
      db.batchSchedule.deleteMany({ where: { batchId: id } }),
      db.batchSchedule.createMany({ data: rows }),
    ]);
    await createAuditLog({
      action: "UPDATE_BATCH_TIMETABLE",
      resource: "Batch",
      details: `Set ${batch.name}'s timetable: ${rows.length} session${rows.length === 1 ? "" : "s"} a week`,
      userId: user.id,
      batchId: id,
    });
    changed();
    return { success: true, message: rows.length ? "Timetable saved." : "Timetable cleared." };
  });
}

/** The batch's timetable expanded over the range, each session marked new or skipped. */
async function buildPlan(id: string, input: PlanInput) {
  const { from, to } = planSchema.parse(input);
  const batch = await db.batches.findUnique({
    where: { id },
    select: { id: true, name: true, isArchived: true, schedules: true },
  });
  if (!batch) throw new ActionError("That batch no longer exists.");
  if (batch.isArchived) throw new ActionError("Restore the batch before planning sessions.");
  const slots = batch.schedules.filter((s): s is typeof s & Slot => !!(s.endTime && s.trainingLocationsId && s.staffId));
  if (!slots.length) throw new ActionError(`Set ${batch.name}'s weekly timetable first.`);

  const rangeStart = academyInstant(from, "00:00");
  const rangeEnd = academyInstant(to, "23:59");
  const busy = await db.training.findMany({
    where: {
      status: { not: "CANCELLED" },
      isArchived: false,
      date: { gte: new Date(rangeStart.getTime() - 24 * 3_600_000), lte: rangeEnd },
      OR: [
        { batchesId: id },
        { staffId: { in: slots.map((s) => s.staffId) } },
        { trainingLocationsId: { in: slots.map((s) => s.trainingLocationsId) } },
      ],
    },
    select: { date: true, duration: true, staffId: true, trainingLocationsId: true, batchesId: true },
  });
  const plan = planSessions(
    id,
    slots,
    from,
    to,
    busy.map((b) => ({ ...b, start: b.date, end: new Date(b.date.getTime() + b.duration * 60_000) })),
  ).filter((p) => p.date > new Date()); // never plan into the past
  return { batch, plan };
}

export type PlanPreview = {
  success: true;
  message: string;
  sessions: { date: string; duration: number; skip: string | null }[];
};

export async function previewBatchSessions(id: string, input: PlanInput) {
  return asRole("admin", async (): Promise<PlanPreview> => {
    const { plan } = await buildPlan(id, input);
    return {
      success: true,
      message: "",
      sessions: plan.map((p) => ({ date: p.date.toISOString(), duration: p.duration, skip: p.skip })),
    };
  });
}

/** Creates the new sessions from the timetable, each with the batch's active athletes, like a single planned session. */
export async function planBatchSessions(id: string, input: PlanInput) {
  return asRole("admin", async (user) => {
    const { batch, plan } = await buildPlan(id, input);
    const todo = plan.filter((p) => !p.skip);
    if (!todo.length) throw new ActionError("Nothing new to plan in those dates.");

    const athletes = await db.athlete.findMany({ where: { batchesId: id, isArchived: false }, select: { id: true } });
    await db.$transaction(
      todo.map((p) =>
        db.training.create({
          data: {
            batchesId: id,
            name: `${batch.name} training`,
            description: "Weekly training",
            date: p.date,
            duration: p.duration,
            trainingLocationsId: p.trainingLocationsId,
            staffId: p.staffId,
            athletes: { connect: athletes },
          },
        }),
      ),
    );
    await createAuditLog({
      action: "PLAN_BATCH_SESSIONS",
      resource: "Batch",
      details: `Planned ${todo.length} ${batch.name} session${todo.length === 1 ? "" : "s"}, ${formatAcademy(todo[0].date, DAY)} to ${formatAcademy(todo.at(-1)!.date, DAY)}`,
      userId: user.id,
      batchId: id,
    });
    revalidatePath("/sessions");
    revalidatePath("/settings");
    return { success: true, message: `${todo.length} session${todo.length === 1 ? "" : "s"} planned for ${batch.name}.` };
  });
}
