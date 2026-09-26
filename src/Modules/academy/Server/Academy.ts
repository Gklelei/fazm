"use server";

import z from "zod";
import { AcademySchema } from "../Validation";
import { db } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { checkRole, AUTHZ_ACTION_MESSAGES } from "@/lib/authz";


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
    await db.academy.create({
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

    revalidateTag("academy");

    return {
      success: true,
      message: "Academy details created",
    };
  } catch (error) {
    console.log({ error });
    return {
      message: error instanceof Error ? error.message : "Internal server error",
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
    await db.academy.update({
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

    revalidateTag("academy");

    return {
      success: true,
      message: "Academy details updated",
    };
  } catch (error) {
    console.log({ error });
    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
};
