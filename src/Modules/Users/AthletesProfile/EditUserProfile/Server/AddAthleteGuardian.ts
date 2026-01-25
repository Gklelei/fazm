"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import {
  AthleteGuardianSchema,
  AthleteGuardianSchemaType,
} from "@/Modules/Users/AthletesOnboarding/validation/AthleteGuardian";
import { headers } from "next/headers";

type ActionResult = {
  success: boolean;
  message: string;
};

export const AddAthleteGuardian = async (
  data: AthleteGuardianSchemaType,
  athleteId: string
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

  const parsedData = AthleteGuardianSchema.parse(data);

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

    await db.athleteGuardian.create({
      data: {
        email: parsedData.guardianEmail,
        fullNames: parsedData.guardianFullNames,
        phoneNumber: parsedData.guardianPhoneNumber,
        relationship: parsedData.guardianRelationShip,
        athleteId,
      },
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
