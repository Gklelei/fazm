"use server";

import z from "zod";
import { AcademySchema } from "@/features/academy/schemas";
import { db } from "@/lib/prisma";
import { updateTag } from "next/cache";
import { checkRole, AUTHZ_ACTION_MESSAGES } from "@/lib/authz";
import { createAuditLog, diffFields } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";

export const CreateAcademyUtils = async ({
  data,
}: {
  data: z.infer<typeof AcademySchema>;
}): Promise<ActionResult> => {
  const authz = await checkRole(["ADMIN", "SUPER_ADMIN"]);

  if (!authz.ok) {
    return { success: false, message: AUTHZ_ACTION_MESSAGES[authz.reason] };
  }
  try {
    const academy = await db.academy.create({
      data: {
        academyName: data.academyName,
        paymentMathod: data.paymentMethod,
        paymentMethodType: data.paymentType,
        address: data.address,
        contactPhone: data.phone,
        description: data.description,
        contactEmail: data.email,
        tagline: data.tagline,
        logoUrl: data.logoUrl,
        receiptFooterNotes: data.footerNotes,
        primaryColor: data.primaryColor,
      },
    });

    updateTag("academy");
    await createAuditLog({
      action: "CREATE_ACADEMY",
      resource: "Academy",
      details: `Set up the academy profile for "${academy.academyName}"`,
      userId: authz.session.user.id,
      academyId: academy.id,
    });

    return {
      success: true,
      message: "Academy details created",
    };
  } catch (error) {
    console.log({ error });
    return {
      message: actionErrorMessage(error),
      success: false,
    };
  }
};
export const EditAcademyUtils = async ({
  data,
  id,
}: {
  data: z.infer<typeof AcademySchema>;
  id: string;
}): Promise<ActionResult> => {
  const authz = await checkRole(["ADMIN", "SUPER_ADMIN"]);

  if (!authz.ok) {
    return { success: false, message: AUTHZ_ACTION_MESSAGES[authz.reason] };
  }

  try {
    const before = await db.academy.findUnique({ where: { id } });
    const after = await db.academy.update({
      where: {
        id,
      },
      data: {
        academyName: data.academyName,
        paymentMathod: data.paymentMethod,
        paymentMethodType: data.paymentType,
        address: data.address,
        contactPhone: data.phone,
        description: data.description,
        contactEmail: data.email,
        tagline: data.tagline,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
      },
    });

    updateTag("academy");
    await createAuditLog({
      action: "UPDATE_ACADEMY",
      resource: "Academy",
      details: "Updated the academy profile",
      userId: authz.session.user.id,
      academyId: id,
      changes: before ? diffFields(before, { ...after, updatedAt: undefined }) : null,
    });

    return {
      success: true,
      message: "Academy details updated",
    };
  } catch (error) {
    console.log({ error });
    return {
      message: actionErrorMessage(error),
      success: false,
    };
  }
};
