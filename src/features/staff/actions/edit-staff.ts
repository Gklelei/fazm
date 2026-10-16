"use server";

import { LOOKUP, lookupsChanged } from "@/lib/lookups";
import { hasRole } from "@/lib/roles";
import { db } from "@/lib/prisma";
import { AccountSettingSchemaType } from "@/features/staff/schemas/profile";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { EditStaffSchemaType } from "@/features/staff/schemas";
import { headers } from "next/headers";
import { createAuditLog, diffFields } from "@/lib/audit";
import { actionErrorMessage } from "@/lib/action";


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
    return { success: false, message: "Your session has ended. Sign in again." };
  }
  // Your own profile; admins may edit anyone's
  if (id !== session.user.id && !hasRole(session.user.role, "admin")) {
    return { success: false, message: "You can only edit your own profile." };
  }
  try {
    const existingUser = await db.user.findUnique({
      where: {
        id,
      },
      include: { staff: { select: { fullNames: true, phoneNumber: true } } },
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
    lookupsChanged(LOOKUP.coaches);
    await createAuditLog({
      action: "UPDATE_PROFILE",
      resource: "User",
      details: id === session.user.id ? "Updated their own profile" : `Updated ${existingUser.name}'s profile`,
      userId: session.user.id,
      recordId: id,
      changes: diffFields(
        { fullNames: existingUser.staff?.fullNames ?? existingUser.name, phoneNumber: existingUser.staff?.phoneNumber, image: existingUser.image },
        { fullNames: data.fullNames, phoneNumber: data.phoneNumber, image: data.profilePicture },
      ),
    });
    return {
      message: "Profile updated",
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      message: actionErrorMessage(error),
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

  if (!hasRole(session.user.role, "admin")) {
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
      include: { user: { select: { id: true, role: true, email: true, image: true } } },
    });
    if (!existingUser) {
      return {
        success: false,
        message: "User  does not exist",
      };
    }
    const previousRole = existingUser.user?.role;

    // Granting or removing super admin is reserved to super admins
    if (
      (data.role === "SUPER_ADMIN" || previousRole === "SUPER_ADMIN") &&
      data.role !== previousRole &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return { success: false, message: "Only a super admin can change a super admin's role." };
    }

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

    await createAuditLog({
      action: "UPDATE_STAFF",
      resource: "Staff",
      details: `Updated staff member ${data.fullName} (${id})`,
      userId: session.user.id,
      recordId: id,
      changes: diffFields(
        { fullNames: existingUser.fullNames, phoneNumber: existingUser.phoneNumber, email: existingUser.user?.email, role: previousRole, image: existingUser.user?.image },
        { fullNames: data.fullName, phoneNumber: data.phoneNumber, email: data.email, role: data.role, image: data.image || "" },
      ),
    });
    revalidatePath("/staff/profile");
    revalidatePath("/staff");
    lookupsChanged(LOOKUP.coaches);
    return {
      message: "User updated",
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      message: actionErrorMessage(error),
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

  if (!hasRole(session.user.role, "admin")) {
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
    // Sign them out everywhere now, not when their session would expire
    // (a cached sign-in can last up to 5 more minutes)
    await db.session.deleteMany({ where: { userId: existingUser.userId } });

    revalidatePath("/staff");
    lookupsChanged(LOOKUP.coaches);

    await createAuditLog({
      action: "ARCHIVE_STAFF",
      resource: "Staff",
      details: `Archived staff member ${existingUser.fullNames} (${staffId}); they can no longer sign in`,
      userId: session.user.id,
      recordId: staffId,
    });
    return {
      success: true,
      message: "User deleted",
    };
  } catch (error) {
    console.log({ error });
    return {
      message: actionErrorMessage(error),
      success: false,
    };
  }
};
