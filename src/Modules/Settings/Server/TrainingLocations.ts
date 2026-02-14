"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { toUpperUnderscore } from "@/utils/TansformWords";
import {
  TrainingLocationSchema,
  TrainingLocationSchemaType,
} from "../Validation";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      ok: false as const,
      res: { success: false, message: "Unauthorized: Please log in." },
    };
  }

  return { ok: true as const, session };
}

function requireAdminRole(role?: string | null): ActionResult | null {
  if (!ADMIN_ROLES.includes(role ?? "")) {
    return {
      success: false,
      message: "Unauthorized: You are not allowed to perform this action.",
    };
  }
  return null;
}

export async function CreateTrainingLocations(
  data: TrainingLocationSchemaType,
): Promise<ActionResult> {
  const s = await requireSession();
  if (!s.ok) return s.res;

  // Decide policy: typically creation should be admin-only.
  const roleErr = requireAdminRole(s.session.user.role);
  if (roleErr) return roleErr;

  const values = TrainingLocationSchema.parse(data);

  try {
    const upperValue = toUpperUnderscore(values.name);

    // prevent duplicate active locations
    const existing = await db.trainingLocations.findFirst({
      where: {
        value: upperValue,
        voided: 0,
      },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        message: "A location with the same name already exists.",
      };
    }

    await db.trainingLocations.create({
      data: {
        name: values.name.trim(),
        value: upperValue,
        voided: 0,
      },
    });

    return {
      success: true,
      message: "Training location created successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error.",
    };
  }
}

export async function EditTrainingLocations(
  data: TrainingLocationSchemaType,
  id: string,
): Promise<ActionResult> {
  const s = await requireSession();
  if (!s.ok) return s.res;

  const roleErr = requireAdminRole(s.session.user.role);
  if (roleErr) return roleErr;

  const values = TrainingLocationSchema.parse(data);

  try {
    const existingLocation = await db.trainingLocations.findUnique({
      where: { id },
      select: { id: true, voided: true },
    });

    if (!existingLocation || (existingLocation.voided ?? 0) === 1) {
      return {
        success: false,
        message: "Training location not found.",
      };
    }

    const upperValue = toUpperUnderscore(values.name);

    // block duplicates (excluding the current record)
    const duplicate = await db.trainingLocations.findFirst({
      where: {
        value: upperValue,
        voided: 0,
        NOT: { id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: "Another active location already uses that name.",
      };
    }

    await db.trainingLocations.update({
      where: { id },
      data: {
        name: values.name.trim(),
        value: upperValue,
      },
    });

    return {
      success: true,
      message: "Training location updated successfully.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error.",
    };
  }
}

export async function DeleteTrainingLocation(
  id: string,
): Promise<ActionResult> {
  const s = await requireSession();
  if (!s.ok) return s.res;

  const roleErr = requireAdminRole(s.session.user.role);
  if (roleErr) return roleErr;

  try {
    const existingLocation = await db.trainingLocations.findUnique({
      where: { id },
      select: { id: true, voided: true },
    });

    if (!existingLocation || (existingLocation.voided ?? 0) === 1) {
      return {
        success: false,
        message: "Training location not found.",
      };
    }

    await db.trainingLocations.update({
      where: { id },
      data: { voided: 1 },
    });

    return {
      success: true,
      message: "Training location has been deleted.",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Internal server error.",
    };
  }
}
