"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AttendanceStatus } from "@/generated/prisma/enums";
import { checkRole, AUTHZ_ACTION_MESSAGES } from "@/lib/authz";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/prisma";
import { FORBIDDEN_MESSAGE, ROLE_GROUPS } from "@/lib/roles";

const AttendanceInput = z
  .array(
    z.object({
      athleteId: z.string().min(1),
      status: z.enum(AttendanceStatus),
      reasonId: z.string().min(1).nullable(),
    }),
  )
  .min(1, "Mark at least one athlete.");

export type SaveAttendanceInput = z.infer<typeof AttendanceInput>;

/**
 * Saves the marks for one session. The recording coach is the session's
 * coach (not something the browser sends), and a coach can only mark
 * sessions they run.
 */
export async function saveAttendance(
  input: SaveAttendanceInput,
  trainingId: string,
): Promise<ActionResult> {
  const authz = await checkRole([...ROLE_GROUPS.coaching]);
  if (!authz.ok) return { success: false, message: AUTHZ_ACTION_MESSAGES[authz.reason] };
  const { user } = authz.session;

  const parsed = AttendanceInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid attendance." };
  }

  const training = await db.training.findUnique({
    where: { id: trainingId },
    select: {
      name: true,
      staffId: true,
      isArchived: true,
      coach: { select: { userId: true } },
      athletes: { select: { athleteId: true } },
    },
  });
  if (!training || training.isArchived) {
    return { success: false, message: "This session no longer exists." };
  }
  if (user.role === "COACH" && training.coach.userId !== user.id) {
    return { success: false, message: FORBIDDEN_MESSAGE };
  }

  const squad = new Set(training.athletes.map((a) => a.athleteId));
  const outsiders = parsed.data.filter((a) => !squad.has(a.athleteId));
  if (outsiders.length) {
    return {
      success: false,
      message: `${outsiders.length} athlete(s) aren't in this session's squad.`,
    };
  }

  try {
    await db.$transaction(
      parsed.data.map((a) => {
        // A reason only makes sense when the athlete wasn't simply present
        const reasonId = a.status === "PRESENT" ? null : a.reasonId;
        return db.attendance.upsert({
          where: { trainingId_athleteId: { trainingId, athleteId: a.athleteId } },
          create: {
            trainingId,
            athleteId: a.athleteId,
            coachId: training.staffId,
            status: a.status,
            reasonId,
          },
          update: { status: a.status, reasonId },
        });
      }),
    );

    await createAuditLog({
      action: "MARK_ATTENDANCE",
      resource: "Training",
      details: `Marked ${parsed.data.length} athlete(s) for ${training.name}`,
      userId: user.id,
      trainingId,
    });

    revalidatePath(`/sessions/attendance/mark/${trainingId}`);
    revalidatePath(`/sessions/view/${trainingId}`);
    revalidatePath("/sessions");
    return { success: true, message: `Attendance saved for ${parsed.data.length} athletes.` };
  } catch (error) {
    console.error("Attendance save failed:", error);
    return { success: false, message: "Couldn't save attendance. Try again." };
  }
}
