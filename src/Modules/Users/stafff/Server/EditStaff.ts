"use server";

import { db } from "@/lib/prisma";
import { AccountSettingSchemaType } from "../Validation/Profile";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { EditStaffSchemaType } from "../Validation";
import { headers } from "next/headers";
import { createAuditLog } from "@/lib/audit";

export const EditStaffProfile = async ({
  data,
  id,
}: {
  id: string;
  data: AccountSettingSchemaType;
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized access, please login");
  }
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
    revalidatePath("/staff/profile");
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
export const AdminEditStaffProfile = async ({
  data,
  id,
}: {
  id: string;
  data: EditStaffSchemaType;
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access, please login",
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Unauthorized access,You are not allowed to perfome this role",
    };
  }
  try {
    const existingUser = await db.staff.findUnique({
      where: {
        staffId: id,
      },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!existingUser) {
      return {
        success: false,
        message: "User  does not exist",
      };
    }
    const previousRole = existingUser.user?.role;

    await db.staff.update({
      where: {
        staffId: id,
      },
      data: {
        phoneNumber: data.phoneNumber,
        fullNames: data.fullName,
        user: {
          update: {
            email: data.email,
            image: data.image || "",
            role: data.role,
          },
        },
      },
    });

    if (previousRole !== data.role && existingUser.user) {
      await createAuditLog({
        action: "ROLE_CHANGE",
        resource: "User",
        details: `Changed role for ${data.fullName} from ${previousRole ?? "none"} to ${data.role}`,
        userId: session.user.id,
      });
    }

    revalidatePath("/staff/profile");
    revalidatePath("/staff");
    return {
      message: "User updated",
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

export const AdminDeleteStaff = async ({
  staffId,
}: {
  staffId: string;
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      message: "Unauthorized requst,please login",
      success: false,
    };
  }

  if (session.user.role !== "ADMIN") {
    return {
      message:
        "Unauthorized access, you are not allowe to perfome this operation",
      success: false,
    };
  }

  try {
    const existingUser = await db.staff.findUnique({
      where: {
        staffId,
      },
    });

    if (!existingUser) {
      return {
        message: "User not found",
        success: false,
      };
    }

    await db.staff.update({
      where: {
        staffId,
      },
      data: {
        user: {
          update: {
            email: undefined,
            isArchived: true,
          },
        },
      },
    });

    revalidatePath("/staff");

    return {
      success: true,
      message: "User deleted",
    };
  } catch (error) {
    console.log({ error });
    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
};
