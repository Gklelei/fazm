"use server";

import { revalidatePath } from "next/cache";
import { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";
import { checkRole, AUTHZ_ACTION_MESSAGES } from "@/lib/authz";
import { ROLE_GROUPS } from "@/lib/roles";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/prisma";

export async function UpdateAthleteStatus({
  athleteId,
  status,
}: {
  athleteId: string;
  status: ATHLETE_ACCOUNT_STATUS;
}): Promise<ActionResult> {
  const authz = await checkRole([...ROLE_GROUPS.admin]);
  if (!authz.ok)
    return { success: false, message: AUTHZ_ACTION_MESSAGES[authz.reason] };

  if (!(status in ATHLETE_ACCOUNT_STATUS)) {
    return { success: false, message: "Unknown status." };
  }

  try {
    const athlete = await db.athlete.update({
      where: { athleteId },
      data: { status },
      select: { id: true, firstName: true, lastName: true },
    });
    await createAuditLog({
      action: "UPDATE_ATHLETE_STATUS",
      resource: "Athlete",
      details: `Set ${athlete.firstName} ${athlete.lastName} to ${status}`,
      userId: authz.session.user.id,
      athleteId: athlete.id,
    });
    revalidatePath("/players");
    return { success: true, message: "Status updated." };
  } catch (error) {
    console.error("Update athlete status failed:", error);
    return {
      success: false,
      message: "Couldn't update the status. Try again.",
    };
  }
}
