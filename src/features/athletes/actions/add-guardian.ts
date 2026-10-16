"use server";

import { ROLE_GROUPS } from "@/lib/roles";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  AthleteGuardianSchema,
  AthleteGuardianSchemaType,
} from "@/features/athletes/schemas/guardian";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";

export const AddAthleteGuardian = async (
  data: AthleteGuardianSchemaType,
  athleteId: string,
): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message:
        "You are not authorized to perform this action. Please contact an administrator.",
    };
  }

  const allowedRoles = [...ROLE_GROUPS.coaching] as string[];
  if (!allowedRoles.includes(session.user.role ?? "")) {
    return {
      success: false,
      message: "Unauthorized: You are not allowed to perform this action.",
    };
  }

  const input1 = AthleteGuardianSchema.safeParse(data);
  if (!input1.success) return { success: false, message: actionErrorMessage(input1.error) };
  const parsedData = input1.data;

  try {
    const athlete = await db.athlete.findUnique({
      where: { athleteId: athleteId },
      select: { id: true },
    });

    if (!athlete) {
      return {
        success: false,
        message: "The athlete you are adding a guardian for does not exist.",
      };
    }

    const duplicateGuardian = await db.athleteGuardian.findFirst({
      where: {
        athleteId,
        OR: [
          { email: parsedData.guardianEmail },
          { phoneNumber: parsedData.guardianPhoneNumber },
        ],
      },
    });

    if (duplicateGuardian) {
      return {
        success: false,
        message:
          "A guardian with this email or phone number already exists for this athlete.",
      };
    }

    const guardian = await db.athleteGuardian.create({
      data: {
        email: parsedData.guardianEmail,
        fullNames: parsedData.guardianFullNames,
        phoneNumber: parsedData.guardianPhoneNumber,
        relationship: parsedData.guardianRelationShip,
        athleteId,
      },
    });

    await createAuditLog({
      action: "ADD_GUARDIAN",
      resource: "Guardian",
      details: `Added ${parsedData.guardianFullNames} (${parsedData.guardianRelationShip}) as a guardian of ${athleteId}`,
      userId: session.user.id,
      athleteId: athlete.id,
      recordId: guardian.id,
    });

    return {
      success: true,
      message: "Guardian saved successfully.",
    };
  } catch (error) {
    console.error("AddAthleteGuardian error:", error);
    return {
      success: false,
      message: "Internal server error.",
    };
  }
};
