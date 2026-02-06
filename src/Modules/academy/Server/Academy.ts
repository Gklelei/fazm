"use server";

import z from "zod";
import { AcademySchema } from "../Validation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export const CreateAcademyUtils = async ({
  data,
}: {
  data: z.infer<typeof AcademySchema>;
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access,Please login to continue",
    };
  }

  const allowedRoles = ["ADMIN", "SUPER"];

  if (!allowedRoles.includes(session?.user.role ?? "")) {
    return {
      success: false,
      message: "You are not allowed to perform this operation",
    };
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
      },
    });

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access,Please login to continue",
    };
  }

  const allowedRoles = ["ADMIN", "SUPER"];

  if (!allowedRoles.includes(session?.user.role ?? "")) {
    return {
      success: false,
      message: "You are not allowed to perform this operation",
    };
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
      },
    });

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
