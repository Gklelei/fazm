"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/prisma";
import { asRole } from "@/lib/action";
import { createAuditLog, diffFields } from "@/lib/audit";
import { AcademySchema, type AcademyInput } from "@/features/academy/schemas";

/** Creates the academy profile the first time, then updates that one row. */
export async function saveAcademy(input: AcademyInput) {
  return asRole("admin", async (user) => {
    const v = AcademySchema.parse(input);
    const data = {
      academyName: v.academyName,
      tagline: v.tagline,
      description: v.description || null,
      address: v.address,
      contactPhone: v.phone,
      contactEmail: v.email,
      paymentMethodType: v.paymentType,
      paymentMathod: v.paymentMethod,
      paymentReference: v.paymentReference || null,
      bankName: v.bankName || null,
      bankAccountName: v.bankAccountName || null,
      bankAccountNumber: v.bankAccountNumber || null,
      bankBranch: v.bankBranch || null,
      receiptFooterNotes: v.footerNotes || null,
      logoUrl: v.logoUrl || null,
      primaryColor: v.primaryColor,
      theme: v.theme,
    };
    const before = await db.academy.findFirst();
    const after = before ? await db.academy.update({ where: { id: before.id }, data }) : await db.academy.create({ data });

    updateTag("academy");
    revalidatePath("/", "layout");
    await createAuditLog({
      action: before ? "UPDATE_ACADEMY" : "CREATE_ACADEMY",
      resource: "Academy",
      details: before ? "Updated the academy profile" : `Set up the academy profile for "${after.academyName}"`,
      userId: user.id,
      academyId: after.id,
      changes: before ? diffFields(before, data) : null,
    });
    return { success: true as const, message: before ? "Academy profile saved." : "Academy profile set up." };
  });
}
