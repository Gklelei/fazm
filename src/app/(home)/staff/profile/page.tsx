import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { deviceOf } from "@/lib/device";
import { formatPhone } from "@/lib/phone";
import { MyProfile } from "@/features/staff/components/MyProfile";
import { advanceBalances } from "@/features/payroll/lib/run";
import { payslipsOf } from "@/features/payroll/queries";

export const metadata: Metadata = { title: "My profile" };

/** One row per device (browser, system and address), newest first, with how many sign-ins it holds. */
function devicesOf(sessions: { id: string; userAgent: string | null; ipAddress: string | null; updatedAt: Date }[], currentId: string) {
  const rows = new Map<string, { id: string; device: string; ip: string | null; lastActive: string; current: boolean; count: number }>();
  for (const x of sessions) {
    const device = deviceOf(x.userAgent) ?? "Unknown device";
    const key = `${device}|${x.ipAddress ?? ""}`;
    const row = rows.get(key);
    if (row) {
      row.count++;
      row.current ||= x.id === currentId;
    } else rows.set(key, { id: x.id, device, ip: x.ipAddress, lastActive: x.updatedAt.toISOString(), current: x.id === currentId, count: 1 });
  }
  return [...rows.values()];
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in?next=/staff/profile");
  const now = new Date();
  const [me, sessions, activity] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: { staff: { include: { batches: { select: { name: true }, orderBy: { name: "asc" } } } } },
    }),
    db.session.findMany({
      where: { userId: session.user.id, expiresAt: { gt: now } },
      select: { id: true, userAgent: true, ipAddress: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.auditLog.findMany({
      where: { userId: session.user.id, action: { not: "VIEW" } },
      select: { id: true, details: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const s = me.staff;
  const [advances, payslips] = s ? await Promise.all([advanceBalances(s.id), payslipsOf(s.id)]) : [[], []];
  const pay = s?.payBasis || payslips.length || advances.length ? { advances, payslips } : null;
  return (
    <MyProfile
      values={{
        fullNames: s?.fullNames ?? me.name,
        photo: s?.photo ?? me.image ?? "",
        phoneNumber: formatPhone(s?.phoneNumber),
        emergencyName: s?.emergencyName ?? "",
        emergencyRelationship: s?.emergencyRelationship ?? "",
        emergencyPhone: formatPhone(s?.emergencyPhone),
      }}
      hasStaffRecord={!!s}
      email={me.email}
      role={me.role}
      work={s ? { staffId: s.staffId, jobTitle: s.jobTitle, batches: s.batches.map((b) => b.name).join(", ") } : null}
      devices={devicesOf(sessions, session.session.id)}
      pay={pay}
      activity={activity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
    />
  );
}
