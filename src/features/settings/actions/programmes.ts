"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { programmeSchema } from "@/features/settings/schemas";

// Programmes (Boys, Girls, Elite): add, rename, archive, restore. Never deleted:
// batches, fee plans and expenses keep pointing at them.

function changed() {
  lookupsChanged(LOOKUP.programmes, LOOKUP.batches, LOOKUP.plans);
  revalidatePath("/", "layout");
}

async function assertNameFree(name: string, exceptId?: string) {
  const clash = await db.programme.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isArchived: false, NOT: exceptId ? { id: exceptId } : undefined },
    select: { id: true },
  });
  if (clash) throw new ActionError(`There's already a programme called "${name}".`);
}

async function assertCodeFree(code: string, exceptId?: string) {
  const clash = await db.programme.findFirst({ where: { code, NOT: exceptId ? { id: exceptId } : undefined }, select: { name: true } });
  if (clash) throw new ActionError(`${clash.name} already uses ${code}. Pick other letters.`);
}

export async function saveProgramme(input: z.input<typeof programmeSchema>, id?: string) {
  return asRole("admin", async (user) => {
    const { name, code: typed } = programmeSchema.parse(input);
    await assertNameFree(name, id);
    const before = id ? await db.programme.findUnique({ where: { id }, select: { name: true, code: true, athleteCounter: true } }) : null;
    if (id && !before) throw new ActionError("That programme no longer exists.");
    // Left out: keep the letters it has
    const code = typed === undefined ? (before?.code ?? null) : typed || null;
    if (code) await assertCodeFree(code, id);
    if (id && before) {
      // Once an athlete has an ID with the letters, they stay
      if (before.code && before.athleteCounter > 0 && code !== before.code) {
        throw new ActionError(`Keep ${before.code}: athletes' IDs already use it.`);
      }
      await db.programme.update({ where: { id }, data: { name, code } });
      const what = [
        before.name !== name && `renamed "${before.name}" to "${name}"`,
        before.code !== code && (code ? `set its ID letters to ${code}` : "removed its ID letters"),
      ].filter(Boolean);
      await createAuditLog({
        action: "UPDATE_PROGRAMME",
        resource: "Programme",
        details: `Programme "${name}": ${what.join(", ") || "saved with no changes"}`,
        userId: user.id,
      });
    } else {
      if (!code) throw new ActionError("Enter the letters for its athletes' IDs, like G.");
      const last = await db.programme.aggregate({ _max: { sortOrder: true } });
      await db.programme.create({ data: { name, code, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
      await createAuditLog({ action: "CREATE_PROGRAMME", resource: "Programme", details: `Added programme "${name}" (IDs ATH/FFA/${code}/…)`, userId: user.id });
    }
    changed();
    return { success: true, message: id ? "Programme saved." : `"${name}" added.` };
  });
}

export async function setProgrammeArchived(id: string, archived: boolean) {
  return asRole("admin", async (user) => {
    const programme = await db.programme.findUnique({ where: { id }, select: { name: true } });
    if (!programme) throw new ActionError("That programme no longer exists.");
    if (archived) {
      const batches = await db.batches.count({ where: { programmeId: id, isArchived: false } });
      if (batches) {
        throw new ActionError(
          `${programme.name} still has ${batches} batch${batches === 1 ? "" : "es"}. Move or archive them first.`,
        );
      }
    } else {
      await assertNameFree(programme.name, id);
    }
    await db.programme.update({ where: { id }, data: { isArchived: archived } });
    await createAuditLog({
      action: archived ? "ARCHIVE_PROGRAMME" : "RESTORE_PROGRAMME",
      resource: "Programme",
      details: `${archived ? "Archived" : "Restored"} programme "${programme.name}"`,
      userId: user.id,
    });
    changed();
    return { success: true, message: `${programme.name} ${archived ? "archived" : "restored"}.` };
  });
}
