import "server-only";
import { db } from "@/lib/prisma";

/**
 * Coaches run their own sessions: they may plan, edit or delete only
 * sessions where they are the coach. Admins may manage any session.
 */
export async function mayManageSession(user: { id: string; role?: string | null }, coachStaffId: string) {
  if (user.role !== "COACH") return true;
  const me = await db.staff.findUnique({ where: { userId: user.id }, select: { staffId: true } });
  return me?.staffId === coachStaffId;
}

export const NOT_YOUR_SESSION = "Coaches can only manage their own sessions. Ask an admin to change this one.";
