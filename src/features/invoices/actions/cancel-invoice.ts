"use server";

import { revalidatePath } from "next/cache";
import { checkRole, AUTHZ_ACTION_MESSAGES } from "@/lib/authz";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/prisma";
import { ROLE_GROUPS } from "@/lib/roles";
import { invoiceStatusFor, payableOf } from "../lib/status";
import { discountNewFeesInvoice } from "@/features/coupons/lib/engine";
import { cancelInvoiceIn } from "../lib/cancel";

/**
 * Cancel an invoice, or restore a cancelled one. The status is never set
 * freely from the browser: restoring derives it from what was actually paid.
 */
export async function setInvoiceCancelled(
  invoiceNumber: string,
  cancelled: boolean,
): Promise<ActionResult> {
  const authz = await checkRole([...ROLE_GROUPS.finance]);
  if (!authz.ok) return { success: false, message: AUTHZ_ACTION_MESSAGES[authz.reason] };

  try {
    const invoice = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { invoiceNumber } });
      if (!inv) throw new UserError("Invoice not found.");
      if (cancelled && inv.status === "PAID") {
        throw new UserError("A paid invoice can't be cancelled. Remove its payments first.");
      }
      if (cancelled === (inv.status === "CANCELED")) return inv;
      // Cancelled: its discounts come off (coupons are released); restored: a fees invoice is
      // discounted again as a new one would be
      if (cancelled) return cancelInvoiceIn(tx, inv.id, authz.session.user.id);
      const updated = await tx.invoice.update({
        where: { invoiceNumber },
        data: { status: invoiceStatusFor(Number(inv.amountPaid), payableOf({ amountDue: inv.amountDue, discount: 0 }), inv.dueDate) },
      });
      await discountNewFeesInvoice(tx, inv.id);
      return updated;
    });

    await createAuditLog({
      action: cancelled ? "CANCEL_INVOICE" : "RESTORE_INVOICE",
      resource: "Invoice",
      details: `${cancelled ? "Cancelled" : "Restored"} invoice ${invoiceNumber}`,
      userId: authz.session.user.id,
      invoiceId: invoice.id,
    });
    revalidatePath("/invoices");
    return { success: true, message: cancelled ? "Invoice cancelled." : "Invoice restored." };
  } catch (error) {
    if (error instanceof UserError) return { success: false, message: error.message };
    console.error("Cancel/restore invoice failed:", error);
    return { success: false, message: "Couldn't update the invoice. Try again." };
  }
}

class UserError extends Error {}
