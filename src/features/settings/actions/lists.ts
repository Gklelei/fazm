"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { toUpperUnderscore } from "@/lib/format";
import { drillSchema, pitchSchema, reasonSchema } from "@/features/settings/schemas";

// Pitches, drills and attendance reasons: add, rename, archive, restore.
// Nothing is deleted, so past sessions and attendance keep their values.

async function log(user: { id: string }, action: string, resource: string, details: string, extra?: { drillId?: string }) {
  await createAuditLog({ action, resource, details, userId: user.id, ...extra });
  revalidatePath("/settings");
}

// ---------- Pitches (training locations; archived = voided 1) ----------

export async function savePitch(input: z.input<typeof pitchSchema>, id?: string) {
  return asRole("admin", async (user) => {
    const { name } = pitchSchema.parse(input);
    const value = toUpperUnderscore(name);
    const clash = await db.trainingLocations.findFirst({ where: { value, voided: 0, NOT: id ? { id } : undefined } });
    if (clash) throw new ActionError(`There's already a pitch called "${clash.name}".`);
    if (id) {
      const before = await db.trainingLocations.findUnique({ where: { id } });
      if (!before) throw new ActionError("That pitch no longer exists.");
      await db.trainingLocations.update({ where: { id }, data: { name, value } });
      await log(user, "UPDATE_LOCATION", "TrainingLocation", `Renamed pitch "${before.name}" to "${name}"`);
    } else {
      await db.trainingLocations.create({ data: { name, value } });
      await log(user, "CREATE_LOCATION", "TrainingLocation", `Added pitch "${name}"`);
    }
    lookupsChanged(LOOKUP.locations);
    return { success: true, message: id ? "Pitch renamed." : `"${name}" added.` };
  });
}

export async function setPitchArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const pitch = await db.trainingLocations.findUnique({ where: { id } });
    if (!pitch) throw new ActionError("That pitch no longer exists.");
    if (!archived && (await db.trainingLocations.findFirst({ where: { value: pitch.value, voided: 0, NOT: { id } } }))) {
      throw new ActionError(`Another active pitch is already called "${pitch.name}". Rename one first.`);
    }
    await db.trainingLocations.update({ where: { id }, data: { voided: archived ? 1 : 0 } });
    // Its timetable slots stay; planning skips slots whose pitch is archived
    await log(user, archived ? "ARCHIVE_LOCATION" : "RESTORE_LOCATION", "TrainingLocation", `${archived ? "Archived" : "Restored"} pitch "${pitch.name}"`);
    lookupsChanged(LOOKUP.locations);
    return { success: true, message: `${pitch.name} ${archived ? "archived" : "restored"}.` };
  });
}

// ---------- Drills (archived = voided 1) ----------

export async function saveDrill(input: z.input<typeof drillSchema>, id?: string) {
  return asRole("admin", async (user) => {
    const { name, description } = drillSchema.parse(input);
    const value = toUpperUnderscore(name);
    const clash = await db.drills.findFirst({ where: { value, voided: 0, NOT: id ? { id } : undefined } });
    if (clash) throw new ActionError(`There's already a drill called "${clash.name}".`);
    const data = { name, value, description: description || null };
    if (id) {
      if (!(await db.drills.findUnique({ where: { id } }))) throw new ActionError("That drill no longer exists.");
      await db.drills.update({ where: { id }, data });
      await log(user, "UPDATE_DRILL", "Drill", `Updated drill "${name}"`, { drillId: id });
    } else {
      const drill = await db.drills.create({ data });
      await log(user, "CREATE_DRILL", "Drill", `Added drill "${name}"`, { drillId: drill.id });
    }
    lookupsChanged(LOOKUP.drills);
    return { success: true, message: id ? "Drill updated." : `"${name}" added.` };
  });
}

export async function setDrillArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const drill = await db.drills.findUnique({ where: { id } });
    if (!drill) throw new ActionError("That drill no longer exists.");
    if (!archived && (await db.drills.findFirst({ where: { value: drill.value, voided: 0, NOT: { id } } }))) {
      throw new ActionError(`Another active drill is already called "${drill.name}". Rename one first.`);
    }
    await db.drills.update({ where: { id }, data: { voided: archived ? 1 : 0 } });
    await log(user, archived ? "ARCHIVE_DRILL" : "RESTORE_DRILL", "Drill", `${archived ? "Archived" : "Restored"} drill "${drill.name}"`, { drillId: id });
    lookupsChanged(LOOKUP.drills);
    return { success: true, message: `${drill.name} ${archived ? "archived" : "restored"}.` };
  });
}

// ---------- Attendance reasons ----------

export async function saveReason(input: z.input<typeof reasonSchema>, id?: string) {
  return asRole("admin", async (user) => {
    const { status, label } = reasonSchema.parse(input);
    const clash = await db.tRAINING_ATTENDANCE_REASONS.findFirst({
      where: { status, label: { equals: label, mode: "insensitive" }, isArchived: false, NOT: id ? { id } : undefined },
    });
    if (clash) throw new ActionError(`"${label}" is already a reason for ${status.toLowerCase()}.`);
    if (id) {
      if (!(await db.tRAINING_ATTENDANCE_REASONS.findUnique({ where: { id } }))) throw new ActionError("That reason no longer exists.");
      await db.tRAINING_ATTENDANCE_REASONS.update({ where: { id }, data: { status, label } });
      await log(user, "UPDATE_ATTENDANCE_REASON", "AttendanceReason", `Updated reason "${label}" (${status})`);
    } else {
      await db.tRAINING_ATTENDANCE_REASONS.create({ data: { status, label } });
      await log(user, "CREATE_ATTENDANCE_REASON", "AttendanceReason", `Added reason "${label}" (${status})`);
    }
    lookupsChanged(LOOKUP.attendanceReasons);
    return { success: true, message: id ? "Reason updated." : `"${label}" added.` };
  });
}

export async function setReasonArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const reason = await db.tRAINING_ATTENDANCE_REASONS.findUnique({ where: { id } });
    if (!reason) throw new ActionError("That reason no longer exists.");
    await db.tRAINING_ATTENDANCE_REASONS.update({ where: { id }, data: { isArchived: archived } });
    await log(
      user,
      archived ? "ARCHIVE_ATTENDANCE_REASON" : "RESTORE_ATTENDANCE_REASON",
      "AttendanceReason",
      `${archived ? "Archived" : "Restored"} reason "${reason.label}" (${reason.status})`,
    );
    lookupsChanged(LOOKUP.attendanceReasons);
    return { success: true, message: `${reason.label} ${archived ? "archived" : "restored"}.` };
  });
}
