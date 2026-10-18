"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ActionError, asRole } from "@/lib/action";
import { createAuditLog } from "@/lib/audit";

const profile = (athleteId: string) => revalidatePath(`/players/user-profile/${athleteId}`);

/** Links two athletes as siblings. Joining someone already in a family brings the whole family along. */
export async function linkSiblings(athleteId: string, siblingId: string) {
  return asRole("finance", async (user) => {
    if (athleteId === siblingId) throw new ActionError("Choose a different athlete.");
    const [a, b] = await Promise.all(
      [athleteId, siblingId].map((id) => db.athlete.findUnique({ where: { athleteId: id }, select: { id: true, athleteId: true, familyId: true, firstName: true, lastName: true } })),
    );
    if (!a || !b) throw new ActionError("One of them no longer exists. Refresh the page.");

    const familyId = await db.$transaction(async (tx) => {
      const keep = a.familyId ?? b.familyId ?? (await tx.family.create({ data: {} })).id;
      const other = a.familyId && b.familyId && a.familyId !== b.familyId ? b.familyId : null;
      // Merge the other family into this one, then link both
      if (other) {
        await tx.athlete.updateMany({ where: { familyId: other }, data: { familyId: keep } });
        await tx.family.delete({ where: { id: other } });
      }
      await tx.athlete.updateMany({ where: { athleteId: { in: [a.athleteId, b.athleteId] } }, data: { familyId: keep } });
      return keep;
    });

    profile(a.athleteId);
    profile(b.athleteId);
    await createAuditLog({
      action: "LINK_SIBLINGS",
      resource: "Athlete",
      details: `Linked ${a.firstName} ${a.lastName} (${a.athleteId}) and ${b.firstName} ${b.lastName} (${b.athleteId}) as siblings`,
      userId: user.id,
      athleteId: a.id,
      recordId: familyId,
    });
    return { success: true as const, message: `${b.firstName} is now linked as a sibling.` };
  });
}

/** Takes an athlete out of their family. A family left with one child is removed. */
export async function unlinkSibling(athleteId: string) {
  return asRole("finance", async (user) => {
    const a = await db.athlete.findUnique({ where: { athleteId }, select: { id: true, athleteId: true, familyId: true, firstName: true, lastName: true } });
    if (!a?.familyId) throw new ActionError("They're not in a family.");
    const familyId = a.familyId;
    await db.$transaction(async (tx) => {
      await tx.athlete.update({ where: { id: a.id }, data: { familyId: null } });
      const left = await tx.athlete.findMany({ where: { familyId }, select: { id: true } });
      if (left.length <= 1) {
        await tx.athlete.updateMany({ where: { familyId }, data: { familyId: null } });
        await tx.family.delete({ where: { id: familyId } });
      }
    });
    profile(a.athleteId);
    await createAuditLog({
      action: "UNLINK_SIBLING",
      resource: "Athlete",
      details: `Took ${a.firstName} ${a.lastName} (${a.athleteId}) out of their family`,
      userId: user.id,
      athleteId: a.id,
      recordId: familyId,
    });
    return { success: true as const, message: `${a.firstName} is no longer linked to the family.` };
  });
}
