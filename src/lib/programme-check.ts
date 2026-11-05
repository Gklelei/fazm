import "server-only";
import { db } from "@/lib/prisma";
import { ActionError } from "@/lib/action";

/**
 * An optional programme id from a form: "" means none (shared, any programme).
 * Returns the programme, or null; refuses one that's archived or gone.
 */
export async function optionalProgramme(id: string | null | undefined) {
  if (!id) return null;
  const programme = await db.programme.findUnique({ where: { id }, select: { id: true, name: true, isArchived: true } });
  if (!programme || programme.isArchived) throw new ActionError("Pick a programme that's in use.");
  return programme;
}
