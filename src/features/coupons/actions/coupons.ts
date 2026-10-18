"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/prisma";
import { createAuditLog, diffFields } from "@/lib/audit";
import { ActionError, asRole } from "@/lib/action";
import { academyDate, academyInstant } from "@/lib/academy-time";
import { couponSchema, type CouponInput, type CouponValues } from "@/features/coupons/schemas";

const fields = (v: CouponValues) => ({
  name: v.name,
  discountType: v.discountType,
  value: new Prisma.Decimal(v.value),
  interval: v.interval,
  startDate: academyInstant(v.startDate, "00:00"),
  // Valid to the end of that day in Nairobi
  expiryDate: v.expiryDate ? academyInstant(v.expiryDate, "23:59") : null,
  usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
  oncePerAthlete: v.oncePerAthlete,
});

/** The saved coupon as the log shows it. */
const logged = (c: ReturnType<typeof fields> & { plans: string[] }) => ({
  ...c,
  value: Number(c.value),
  startDate: academyDate(c.startDate),
  expiryDate: c.expiryDate ? academyDate(c.expiryDate) : null,
});

async function nameFree(name: string, exceptId?: string) {
  const other = await db.coupon.findFirst({ where: { name, ...(exceptId && { NOT: { id: exceptId } }) }, select: { id: true } });
  if (other) throw new ActionError(`${name} already exists. Choose another code.`);
}

async function checkPlans(ids: string[]) {
  if ((await db.subscriptionPlan.count({ where: { id: { in: ids } } })) !== new Set(ids).size) {
    throw new ActionError("One of those fee plans no longer exists. Choose again.");
  }
}

const touched = (id?: string) => {
  revalidatePath("/coupons");
  if (id) revalidatePath(`/coupons/${id}`);
};

export async function createCoupon(input: CouponInput) {
  return asRole("finance", async (user) => {
    const v = couponSchema.parse(input);
    await nameFree(v.name);
    await checkPlans(v.plans);
    const c = await db.coupon.create({ data: { ...fields(v), plans: { connect: v.plans.map((id) => ({ id })) } } });
    touched();
    await createAuditLog({ action: "CREATE_COUPON", resource: "Coupon", details: `Created coupon ${c.name}`, userId: user.id, recordId: c.id });
    return { success: true as const, message: `${c.name} is ready to use.`, id: c.id };
  });
}

export async function updateCoupon(id: string, input: CouponInput) {
  return asRole("finance", async (user) => {
    const v = couponSchema.parse(input);
    const before = await db.coupon.findUnique({ where: { id }, include: { plans: { select: { id: true } } } });
    if (!before) throw new ActionError("That coupon no longer exists.");
    if (before.voided) throw new ActionError("Restore the coupon before editing it.");
    if (v.usageLimit && Number(v.usageLimit) < before.timesUsed) {
      throw new ActionError(`It's been used ${before.timesUsed} times, so the limit can't be lower than that.`);
    }
    await nameFree(v.name, id);
    await checkPlans(v.plans);
    // Discounts already given stay as they are; changes apply from now on
    await db.coupon.update({ where: { id }, data: { ...fields(v), plans: { set: v.plans.map((p) => ({ id: p })) } } });
    touched(id);
    await createAuditLog({
      action: "UPDATE_COUPON",
      resource: "Coupon",
      details: `Updated coupon ${v.name}`,
      userId: user.id,
      recordId: id,
      changes: diffFields(logged({ ...before, plans: before.plans.map((p) => p.id).sort() }), logged({ ...fields(v), plans: [...v.plans].sort() })),
    });
    return { success: true as const, message: "Changes saved.", id };
  });
}

/** Switch a coupon on or off; switched off, it can't be applied but keeps its history. */
export async function setCouponActive(id: string, active: boolean) {
  return asRole("finance", async (user) => {
    const c = await db.coupon.update({ where: { id, voided: 0 }, data: { status: active ? 1 : 0 } }).catch(() => null);
    if (!c) throw new ActionError("That coupon no longer exists.");
    touched(id);
    await createAuditLog({
      action: active ? "ACTIVATE_COUPON" : "DEACTIVATE_COUPON",
      resource: "Coupon",
      details: `Switched ${active ? "on" : "off"} coupon ${c.name}`,
      userId: user.id,
      recordId: id,
    });
    return { success: true as const, message: active ? `${c.name} is on.` : `${c.name} is off.` };
  });
}

/** Archive (or restore) a coupon. Discounts it already gave stay. */
export async function setCouponArchived(id: string, archived: boolean) {
  return asRole("finance", async (user) => {
    const c = await db.coupon.update({ where: { id }, data: { voided: archived ? 1 : 0 } }).catch(() => null);
    if (!c) throw new ActionError("That coupon no longer exists.");
    touched(id);
    await createAuditLog({
      action: archived ? "ARCHIVE_COUPON" : "RESTORE_COUPON",
      resource: "Coupon",
      details: `${archived ? "Archived" : "Restored"} coupon ${c.name}`,
      userId: user.id,
      recordId: id,
    });
    return { success: true as const, message: archived ? `${c.name} is archived.` : `${c.name} is restored.` };
  });
}
