"use server";

import { db } from "@/lib/prisma";
import { AccountSettingSchemaType } from "../Validation/Profile";
import { revalidatePath } from "next/cache";

export const EditStaffProfile = async ({
  data,
  id,
}: {
  id: string;
  data: AccountSettingSchemaType;
}): Promise<ActionResult> => {
  try {
    const existingUser = await db.user.findUnique({
      where: {
        id,
      },
    });
    if (!existingUser) {
      return {
        success: false,
        message: "User account does not exist",
      };
    }
    await db.user.update({
      where: {
        id,
      },
      data: {
        name: data.fullNames,
        // email: data.email,
        image: data.profilePicture,
        staff: {
          update: {
            fullNames: data.fullNames,
            phoneNumber: data.phoneNumber,
          },
        },
      },
    });
    revalidatePath("/users/staff/profile");
    return {
      message: "Profile updated",
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
};
