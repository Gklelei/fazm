"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { academyInstant } from "@/lib/academy-time";
import { planSessions, type Slot } from "@/features/settings/lib/plan-sessions";
import {
  planSchema,
  squadSchema,
  timetableSchema,
  type PlanInput,
  type SquadInput,
  type TimetableInput,
} from "@/features/settings/schemas";

function changed() {
  lookupsChanged(LOOKUP.batches);
  revalidatePath("/settings");
}

async function findSquad(id: string) {
  const squad = await db.batches.findUnique({ where: { id }, select: { id: true, name: true, isArchived: true } });
  if (!squad) throw new ActionError("That squad no longer exists.");
  return squad;
}

async function assertNameFree(name: string, exceptId?: string) {
  const clash = await db.batches.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isArchived: false, NOT: exceptId ? { id: exceptId } : undefined },
    select: { id: true },
  });
  if (clash) throw new ActionError(`There's already a squad called "${name}".`);
}

export async function saveSquad(input: SquadInput, id?: string) {
  return asRole("admin", async (user) => {
    const data = squadSchema.parse(input);
    await assertNameFree(data.name, id);
    const description = data.description || null;
    const squad = id
      ? (await findSquad(id), await db.batches.update({ where: { id }, data: { name: data.name, description } }))
      : await db.batches.create({ data: { name: data.name, description } });
    await createAuditLog({
      action: id ? "UPDATE_BATCH" : "CREATE_BATCH",
      resource: "Batch",
      details: `${id ? "Updated" : "Created"} squad "${squad.name}"`,
      userId: user.id,
      batchId: squad.id,
    });
    changed();
    return { success: true, message: id ? "Squad updated." : `Squad "${squad.name}" added.` };
  });
}

export async function setSquadArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const squad = await findSquad(id);
    if (archived) {
      const active = await db.athlete.count({ where: { batchesId: id, isArchived: false } });
      if (active) {
        throw new ActionError(
          `${squad.name} still has ${active} athlete${active === 1 ? "" : "s"}. Move them to another squad first.`,
        );
      }
    } else {
      await assertNameFree(squad.name, id);
    }
    await db.batches.update({ where: { id }, data: { isArchived: archived } });
    await createAuditLog({
      action: archived ? "ARCHIVE_BATCH" : "RESTORE_BATCH",
      resource: "Batch",
      details: `${archived ? "Archived" : "Restored"} squad "${squad.name}"`,
      userId: user.id,
      batchId: id,
    });
    changed();
    return { success: true, message: archived ? `${squad.name} archived.` : `${squad.name} restored.` };
  });
}

/** Replaces the squad's weekly timetable. Sessions already planned are left as they are. */
export async function saveTimetable(id: string, input: TimetableInput) {
  return asRole("admin", async (user) => {
    const squad = await findSquad(id);
    if (squad.isArchived) throw new ActionError("Restore the squad before changing its timetable.");
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
      details: `Set ${squad.name}'s timetable: ${rows.length} session${rows.length === 1 ? "" : "s"} a week`,
      userId: user.id,
      batchId: id,
    });
    changed();
    return { success: true, message: rows.length ? "Timetable saved." : "Timetable cleared." };
  });
}

/** The squad's timetable expanded over the range, each session marked new or skipped. */
async function buildPlan(id: string, input: PlanInput) {
  const { from, to } = planSchema.parse(input);
  const squad = await db.batches.findUnique({
    where: { id },
    select: { id: true, name: true, isArchived: true, schedules: true },
  });
  if (!squad) throw new ActionError("That squad no longer exists.");
  if (squad.isArchived) throw new ActionError("Restore the squad before planning sessions.");
  const slots = squad.schedules.filter((s): s is typeof s & Slot => !!(s.endTime && s.trainingLocationsId && s.staffId));
  if (!slots.length) throw new ActionError(`Set ${squad.name}'s weekly timetable first.`);

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
  return { squad, plan };
}

export type PlanPreview = {
  success: true;
  message: string;
  sessions: { date: string; duration: number; skip: string | null }[];
};

export async function previewSquadSessions(id: string, input: PlanInput) {
  return asRole("admin", async (): Promise<PlanPreview> => {
    const { plan } = await buildPlan(id, input);
    return {
      success: true,
      message: "",
      sessions: plan.map((p) => ({ date: p.date.toISOString(), duration: p.duration, skip: p.skip })),
    };
  });
}

/** Creates the new sessions from the timetable, each with the squad's active athletes, like a single planned session. */
export async function planSquadSessions(id: string, input: PlanInput) {
  return asRole("admin", async (user) => {
    const { squad, plan } = await buildPlan(id, input);
    const todo = plan.filter((p) => !p.skip);
    if (!todo.length) throw new ActionError("Nothing new to plan in those dates.");

    const athletes = await db.athlete.findMany({ where: { batchesId: id, isArchived: false }, select: { id: true } });
    await db.$transaction(
      todo.map((p) =>
        db.training.create({
          data: {
            batchesId: id,
            name: `${squad.name} training`,
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
      details: `Planned ${todo.length} ${squad.name} session${todo.length === 1 ? "" : "s"} from ${input.from} to ${input.to}`,
      userId: user.id,
      batchId: id,
    });
    revalidatePath("/sessions");
    revalidatePath("/settings");
    return { success: true, message: `${todo.length} session${todo.length === 1 ? "" : "s"} planned for ${squad.name}.` };
  });
}
