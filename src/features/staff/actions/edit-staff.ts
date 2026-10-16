"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";
import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { myProfileSchema, type MyProfileInput } from "@/features/staff/schemas/profile";

/** The signed-in person updates their own name, photo, phone and emergency contact. */
export async function updateMyProfile(input: MyProfileInput): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, message: "Your session has ended. Sign in again." };
  try {
    const v = myProfileSchema.parse(input);
    const me = await db.user.findUniqueOrThrow({ where: { id: session.user.id }, include: { staff: true } });
    if (me.staff && !v.phoneNumber) return { success: false, message: "Enter your phone" };

    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { name: v.fullNames, image: v.photo || null } }),
      ...(me.staff
        ? [
            db.staff.update({
              where: { id: me.staff.id },
              data: {
                fullNames: v.fullNames,
                photo: v.photo || null,
                phoneNumber: v.phoneNumber,
                emergencyName: v.emergencyName || null,
                emergencyRelationship: v.emergencyRelationship || null,
                emergencyPhone: v.emergencyPhone || null,
              },
            }),
          ]
        : []),
    ]);

    revalidatePath("/staff/profile");
    lookupsChanged(LOOKUP.coaches);
    const s = me.staff;
    await createAuditLog({
      action: "UPDATE_PROFILE",
      resource: "User",
      details: "Updated their own profile",
      userId: me.id,
      recordId: s?.staffId ?? me.id,
      changes: diffFields(
        {
          fullNames: s?.fullNames ?? me.name,
          photo: s?.photo ?? me.image ?? "",
          phoneNumber: s?.phoneNumber ?? "",
          emergencyName: s?.emergencyName ?? "",
          emergencyRelationship: s?.emergencyRelationship ?? "",
          emergencyPhone: s?.emergencyPhone ?? "",
        },
        { ...v, ...(!s && { phoneNumber: "", emergencyName: "", emergencyRelationship: "", emergencyPhone: "" }) },
      ),
    });
    return { success: true, message: "Profile saved." };
  } catch (error) {
    return { success: false, message: actionErrorMessage(error) };
  }
}
