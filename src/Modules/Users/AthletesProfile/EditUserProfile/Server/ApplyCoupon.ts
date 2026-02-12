"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export const ApplyCouponToAtheleteSubscriptionPlan = async ({
  couponCode,
  athleteId,
  subId,
}: {
  couponCode: string;
  athleteId: string;
  subId: string;
}): Promise<ActionResult> => {
  const acceptedRoles = ["ADMIN", "SUPER_ADMIN"];

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access, please login first",
    };
  }
  if (!acceptedRoles.includes(session.user?.role || "")) {
    return {
      success: false,
      message:
        "Unauthorized access, you dont have enough permissions to perform this role",
    };
  }

  try {
    const normalizedCode = couponCode.trim().toUpperCase();

    const coupon = await db.coupon.findUnique({
      where: { name: normalizedCode },
      select: {
        id: true,
        name: true,
        voided: true,
        status: true,
        startDate: true,
        expiryDate: true,
        usageLimit: true,
        timesUsed: true,
      },
    });

    if (!coupon) return { success: false, message: "Coupon not found" };
    if (coupon.voided === 1)
      return { success: false, message: "Coupon is voided" };

    console.log(coupon.status);
    if (coupon.status !== 1)
      return { success: false, message: "Coupon is inactive" };

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return { success: false, message: "Coupon is not active yet" };
    }
    if (coupon.expiryDate && now > coupon.expiryDate) {
      return { success: false, message: "Coupon has expired" };
    }
    if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) {
      return { success: false, message: "Coupon usage limit reached" };
    }

    const sub = await db.athleteSubscription.findUnique({
      where: { id: subId },
      select: { id: true, athleteId: true, status: true, couponId: true },
    });

    if (!sub) return { success: false, message: "Subscription not found" };
    if (sub.athleteId !== athleteId) {
      return {
        success: false,
        message: "Subscription does not belong to this athlete",
      };
    }
    if (sub.status !== "ACTIVE") {
      return {
        success: false,
        message: "Coupon can only be applied to an ACTIVE subscription",
      };
    }

    // ✅ already has the same coupon (idempotent)
    if (sub.couponId === coupon.id) {
      return {
        success: true,
        message: "Coupon is already applied to this subscription",
      };
    }

    // ✅ already has a different coupon (block override)
    if (sub.couponId && sub.couponId !== coupon.id) {
      return {
        success: false,
        message:
          "A different coupon is already applied. Remove it first before applying another.",
      };
    }

    await db.athleteSubscription.update({
      where: { id: subId },
      data: {
        couponId: coupon.id,
        updatedBy: session.user.id,
      },
    });

    revalidatePath(`/users/players/user-profile/${athleteId}`);

    return { success: true, message: "Coupon applied to subscription" };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
