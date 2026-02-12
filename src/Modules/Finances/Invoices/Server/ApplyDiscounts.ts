"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

type ActionResult = {
  success: boolean;
  status: number;
  message: string;
};

const allowedRoles = ["ADMIN", "SUPER_ADMIN"];

function money(v: Prisma.Decimal | number | string | null | undefined) {
  if (v == null) return new Prisma.Decimal(0);
  return v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
}

function clampMinZero(d: Prisma.Decimal) {
  return d.lessThan(0) ? new Prisma.Decimal(0) : d;
}

function minDecimal(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lessThan(b) ? a : b;
}

function toUpperTrim(s: string) {
  return s.trim().toUpperCase();
}

/**
 * Applies a coupon discount to a specific invoice.
 * Policy: cap discount so remaining balance becomes 0 (never negative / overpaid).
 * Increments coupon.timesUsed only if the invoice is actually updated.
 */
export const ApplyCouponToInvoice = async ({
  invoiceNumber,
  couponCode,
}: {
  invoiceNumber: string;
  couponCode: string;
}): Promise<ActionResult> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      success: false,
      status: 401,
      message: "Unauthorized. Please login.",
    };
  }
  if (!allowedRoles.includes(session.user.role ?? "")) {
    return {
      success: false,
      status: 403,
      message: "Forbidden. Admin access required.",
    };
  }

  const invNo = invoiceNumber?.trim();
  const code = toUpperTrim(couponCode ?? "");

  if (!invNo)
    return {
      success: false,
      status: 400,
      message: "Invoice number is required.",
    };
  if (!code)
    return { success: false, status: 400, message: "Coupon code is required." };

  try {
    const result = await db.$transaction(async (tx) => {
      // 1) Load invoice (minimal fields needed)
      const invoice = await tx.invoice.findUnique({
        where: { invoiceNumber: invNo },
        select: {
          id: true,
          invoiceNumber: true,
          athleteId: true,
          status: true,
          type: true,
          amountDue: true,
          amountPaid: true,
          discount: true,
          couponId: true,
          dueDate: true,
        },
      });

      if (!invoice) {
        return {
          ok: false as const,
          status: 404,
          message: "Invoice not found.",
        };
      }

      // You can relax/tighten these rules based on your business logic.
      if (invoice.status === "CANCELED") {
        return {
          ok: false as const,
          status: 400,
          message: "Cannot apply coupon to a canceled invoice.",
        };
      }

      const amountDue = money(invoice.amountDue);
      const amountPaid = money(invoice.amountPaid);
      const existingDiscount = money(invoice.discount);

      // Current payable after existing discount
      const currentPayable = amountDue.minus(existingDiscount);
      const remaining = currentPayable.minus(amountPaid);

      // If already settled (paid/covered), don't apply anything
      if (remaining.lessThanOrEqualTo(0)) {
        return {
          ok: false as const,
          status: 400,
          message: "Invoice is already settled (paid or fully covered).",
        };
      }

      // 2) Load coupon
      const coupon = await tx.coupon.findUnique({
        where: { name: code },
        select: {
          id: true,
          name: true,
          discountType: true,
          value: true,
          interval: true,
          startDate: true,
          expiryDate: true,
          usageLimit: true,
          timesUsed: true,
          status: true,
          voided: true,
        },
      });

      if (!coupon)
        return {
          ok: false as const,
          status: 404,
          message: "Coupon not found.",
        };
      if (coupon.voided === 1)
        return {
          ok: false as const,
          status: 400,
          message: "Coupon is voided.",
        };
      if (coupon.status !== 1)
        return {
          ok: false as const,
          status: 400,
          message: "Coupon is inactive.",
        };

      const now = new Date();
      if (coupon.startDate && now < coupon.startDate) {
        return {
          ok: false as const,
          status: 400,
          message: "Coupon is not active yet.",
        };
      }
      if (coupon.expiryDate && now > coupon.expiryDate) {
        return {
          ok: false as const,
          status: 400,
          message: "Coupon has expired.",
        };
      }

      // 3) Prevent multiple coupons on same invoice (idempotent if same)
      if (invoice.couponId && invoice.couponId === coupon.id) {
        return {
          ok: true as const,
          status: 200,
          message: "Coupon is already applied to this invoice.",
        };
      }
      if (invoice.couponId && invoice.couponId !== coupon.id) {
        return {
          ok: false as const,
          status: 409,
          message: "A different coupon is already applied to this invoice.",
        };
      }

      // 4) Compute discount amount
      // Important: compute then CAP to 'remaining' so it only clears the balance (never overpays)
      let discountAmount = new Prisma.Decimal(0);

      const couponValue = money(coupon.value);

      if (coupon.discountType === "PERCENTAGE") {
        // percentage is typically applied on currentPayable or amountDue.
        // Applying on currentPayable avoids weirdness when there was an earlier discount.
        // Either way we cap to remaining, so it won’t go negative.
        const pct = couponValue.div(100);
        discountAmount = currentPayable.mul(pct);
      } else {
        discountAmount = couponValue;
      }

      discountAmount = clampMinZero(discountAmount);

      // cap so it only clears the remaining balance
      discountAmount = minDecimal(discountAmount, remaining);

      if (discountAmount.lessThanOrEqualTo(0)) {
        return {
          ok: false as const,
          status: 400,
          message: "Discount is not applicable for this invoice.",
        };
      }

      // 5) Enforce usage limit safely (concurrency-safe)
      // We increment ONLY if we are really applying the coupon to this invoice.
      if (coupon.usageLimit != null) {
        const updated = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            // still valid and not exceeded at the moment of update
            timesUsed: { lt: coupon.usageLimit },
            status: 1,
            voided: 0,
            OR: [{ expiryDate: null }, { expiryDate: { gt: now } }],
          },
          data: { timesUsed: { increment: 1 } },
        });

        if (updated.count !== 1) {
          return {
            ok: false as const,
            status: 409,
            message: "Coupon usage limit reached.",
          };
        }
      } else {
        // unlimited usage
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { timesUsed: { increment: 1 } },
        });
      }

      // 6) Apply discount to invoice (and mark paid if it clears balance)
      const newDiscount = existingDiscount.add(discountAmount);
      const newPayable = amountDue.minus(newDiscount);
      const newRemaining = newPayable.minus(amountPaid);

      const shouldMarkPaid = newRemaining.lessThanOrEqualTo(0);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          couponId: coupon.id,
          discount: newDiscount,
          status: shouldMarkPaid ? "PAID" : invoice.status, // keep existing if not fully settled
          notes: shouldMarkPaid
            ? "Discount applied; invoice balance cleared."
            : "Discount applied.",
        },
      });

      return {
        ok: true as const,
        status: 200,
        message: shouldMarkPaid
          ? "Discount applied. Invoice balance cleared (PAID)."
          : "Discount applied to invoice.",
      };
    });

    // Revalidate pages that show invoices / athlete billing info
    // Adjust to your routes
    revalidatePath("/finances/invoices");
    // if you have a details page:
    // revalidatePath(`/finances/invoices/${invoiceNumber}`);

    return {
      success: result.ok,
      status: result.status,
      message: result.message,
    };
  } catch (e) {
    console.log(e);
    return {
      success: false,
      status: 500,
      message: e instanceof Error ? e.message : "Internal server error",
    };
  }
};
