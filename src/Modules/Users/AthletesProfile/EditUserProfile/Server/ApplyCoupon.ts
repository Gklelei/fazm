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

    const result = await db.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({
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

      if (!coupon)
        return { ok: false as const, message: "Coupon not found" };
      if (coupon.voided === 1)
        return { ok: false as const, message: "Coupon is voided" };
      if (coupon.status !== 1)
        return { ok: false as const, message: "Coupon is inactive" };

      const now = new Date();
      if (coupon.startDate && now < coupon.startDate) {
        return { ok: false as const, message: "Coupon is not active yet" };
      }
      if (coupon.expiryDate && now > coupon.expiryDate) {
        return { ok: false as const, message: "Coupon has expired" };
      }
      if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) {
        return { ok: false as const, message: "Coupon usage limit reached" };
      }

      const sub = await tx.athleteSubscription.findUnique({
        where: { id: subId },
        select: { id: true, athleteId: true, status: true, couponId: true },
      });

      if (!sub) return { ok: false as const, message: "Subscription not found" };
      if (sub.athleteId !== athleteId) {
        return {
          ok: false as const,
          message: "Subscription does not belong to this athlete",
        };
      }
      if (sub.status !== "ACTIVE") {
        return {
          ok: false as const,
          message: "Coupon can only be applied to an ACTIVE subscription",
        };
      }

      // already has the same coupon (idempotent)
      if (sub.couponId === coupon.id) {
        return {
          ok: true as const,
          message: "Coupon is already applied to this subscription",
        };
      }

      // already has a different coupon (block override)
      if (sub.couponId && sub.couponId !== coupon.id) {
        return {
          ok: false as const,
          message:
            "A different coupon is already applied. Remove it first before applying another.",
        };
      }

      // Enforce usage limit atomically: only increment timesUsed (and only
      // proceed with applying the coupon) if it is still within its limit
      // at the moment of write, so concurrent redemptions can't both pass
      // the check above and both succeed.
      if (coupon.usageLimit != null) {
        const updated = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            timesUsed: { lt: coupon.usageLimit },
            status: 1,
            voided: 0,
            OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
          },
          data: { timesUsed: { increment: 1 } },
        });

        if (updated.count !== 1) {
          return { ok: false as const, message: "Coupon usage limit reached" };
        }
      } else {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { timesUsed: { increment: 1 } },
        });
      }

      await tx.athleteSubscription.update({
        where: { id: subId },
        data: {
          couponId: coupon.id,
          updatedBy: session.user.id,
        },
      });

      return { ok: true as const, message: "Coupon applied to subscription" };
    });

    if (result.ok) {
      revalidatePath(`/players/user-profile/${athleteId}`);
    }

    return { success: result.ok, message: result.message };
  } catch (error) {
    console.log({ error });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
};
