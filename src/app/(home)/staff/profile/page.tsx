import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { deviceOf } from "@/lib/device";
import { formatPhone } from "@/lib/phone";
import { MyProfile } from "@/features/staff/components/MyProfile";

export const metadata: Metadata = { title: "My profile" };

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
      devices={sessions.map((x) => ({
        id: x.id,
        device: deviceOf(x.userAgent) ?? "Unknown device",
        ip: x.ipAddress,
        lastActive: x.updatedAt.toISOString(),
        current: x.id === session.session.id,
      }))}
      activity={activity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
    />
  );
}
