"use server";

import { auth } from "@/lib/auth";
import { couponSchema, couponSchemaType } from "../Validation";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { CouponInterval, DiscountType } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export const CreateCouponsAction = async (
  data: couponSchemaType,
): Promise<ActionResult> => {
  const parsedData = couponSchema.parse(data);

  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      message: "Unauthorized access,please login to continue",
      success: false,
    };
  }

  if (!allowedRoles.includes(session.user?.role || "")) {
    return {
      message:
        "Unauthorized access, you are not allowed to perfome this action",
      success: false,
    };
  }

  try {
    const existingCoupon = await db.coupon.findUnique({
      where: {
        name: parsedData.name.toUpperCase(),
      },
    });

    if (existingCoupon) {
      return {
        message:
          "Please choose another name, coupon with this name already exists",
        success: false,
      };
    }
    await db.coupon.create({
      data: {
        name: parsedData.name.toUpperCase(),
        value: parsedData.value,
        interval: parsedData.interval as CouponInterval,
        discountType: parsedData.discountType as DiscountType,
        startDate: parsedData.startDate,
        expiryDate: parsedData.expiryDate,
        timesUsed: 0,
        usageLimit: parsedData.usageLimit,
        status: 1,
      },
    });
    revalidatePath("/coupons");
    return {
      message: "Coupon created",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
};

export const DeleteCouponsAction = async (
  id: string,
): Promise<ActionResult> => {
  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      message: "Unauthorized access,please login to continue",
      success: false,
    };
  }

  if (!allowedRoles.includes(session.user?.role || "")) {
    return {
      message:
        "Unauthorized access, you are not allowed to perfome this action",
      success: false,
    };
  }

  try {
    const existingCoupon = await db.coupon.findUnique({
      where: {
        id,
      },
    });

    if (!existingCoupon) {
      return {
        message: "Coupon does not exist",
        success: false,
      };
    }

    await db.coupon.update({
      where: {
        id,
      },
      data: {
        voided: 1,
        name: undefined,
      },
    });
    revalidatePath("/coupons");

    return {
      success: true,
      message: "Coupon deleted",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : " Internal server error",
    };
  }
};

export const EditCouponsAction = async (
  data: couponSchemaType,
  id: string,
): Promise<ActionResult> => {
  const parsedData = couponSchema.parse(data);

  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      message: "Unauthorized access,please login to continue",
      success: false,
    };
  }

  if (!allowedRoles.includes(session.user?.role || "")) {
    return {
      message:
        "Unauthorized access, you are not allowed to perfome this action",
      success: false,
    };
  }

  try {
    const existingCoupon = await db.coupon.findUnique({
      where: {
        name: parsedData.name.toUpperCase(),
        id,
      },
    });

    if (existingCoupon) {
      return {
        message:
          "Please choose another name, coupon with this name already exists",
        success: false,
      };
    }
    await db.coupon.update({
      where: { id },
      data: {
        name: parsedData.name.toUpperCase(),
        value: parsedData.value,
        interval: parsedData.interval as CouponInterval,
        discountType: parsedData.discountType as DiscountType,
        startDate: parsedData.startDate,
        expiryDate: parsedData.expiryDate,
        timesUsed: 0,
        usageLimit: parsedData.usageLimit,
        // status: 1,
      },
    });
    revalidatePath("/coupons");
    return {
      message: "Coupon created",
      success: true,
    };
  } catch (error) {
    console.log({ error });
    return {
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    };
  }
};

export const toggleCouponStatus = async (
  id: string,
  status: 0 | 1,
): Promise<ActionResult & { statusCode: number }> => {
  const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      message: "Unauthorized access, please login to continue",
      statusCode: 401,
    };
  }

  if (!allowedRoles.includes(session.user.role || "")) {
    return {
      success: false,
      message:
        "Unauthorized access, you are not allowed to perform this action",
      statusCode: 403,
    };
  }

  try {
    const updated = await db.coupon.updateMany({
      where: {
        id,
        voided: 0,
        expiryDate: {
          equals: null,
          gt: new Date(),
        },
      },
      data: {
        status,
      },
    });

    if (updated.count === 0) {
      return {
        success: false,
        message: "Coupon does not exist or has been voided or has expired",
        statusCode: 404,
      };
    }

    revalidatePath("/coupons");

    return {
      success: true,
      message: status === 1 ? "Coupon activated" : "Coupon deactivated",
      statusCode: 200,
    };
  } catch (error) {
    console.log({ error });

    return {
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
      statusCode: 500,
    };
  }
};
