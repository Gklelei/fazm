import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logView } from "@/lib/audit-view";
import { findStaff } from "@/features/staff/queries/detail";
import { StaffDetails } from "@/features/staff/components/StaffDetails";

export const metadata: Metadata = { title: "Staff" };

const SESSION = { id: true, name: true, date: true, status: true, batch: { select: { name: true } } } as const;
const LOG = { id: true, details: true, createdAt: true, user: { select: { name: true } } } as const;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await findStaff(id);
  if (!staff) notFound();
  const session = await auth.api.getSession({ headers: await headers() });
  const now = new Date();
  const coached = { staffId: staff.staffId, isArchived: false };
  const [upcoming, recent, history, activity, byStatus, minutes] = await Promise.all([
    db.training.findMany({ where: { staffId: staff.staffId, isArchived: false, date: { gte: now } }, select: SESSION, orderBy: { date: "asc" }, take: 5 }),
    db.training.findMany({ where: { staffId: staff.staffId, isArchived: false, date: { lt: now } }, select: SESSION, orderBy: { date: "desc" }, take: 5 }),
    // ponytail: last 20 changes; the activity log has the rest
    db.auditLog.findMany({
      where: { recordId: staff.staffId, action: { notIn: ["VIEW", "EXPORT", "EXPORT_PDF"] } },
      select: LOG,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    staff.userId
      ? db.auditLog.findMany({ where: { userId: staff.userId, action: { not: "VIEW" } }, select: LOG, orderBy: { createdAt: "desc" }, take: 10 })
      : null,
    db.training.groupBy({ by: ["status"], where: coached, _count: { _all: true } }),
    db.training.aggregate({ where: coached, _sum: { duration: true }, _avg: { duration: true } }),
  ]);
  const count = (st: string) => byStatus.find((b) => b.status === st)?._count._all ?? 0;
  const totalSessions = byStatus.reduce((n, b) => n + b._count._all, 0);
  const stats = {
    sessions: totalSessions,
    upcoming: await db.training.count({ where: { ...coached, date: { gte: now } } }),
    completed: count("COMPLETED"),
    hours: Math.round((minutes._sum.duration ?? 0) / 60),
    averageMinutes: Math.round(minutes._avg.duration ?? 0),
  };
  await logView({ resource: "Staff", recordId: staff.staffId, details: `Opened ${staff.fullNames}'s profile (${staff.staffId})` });
  return (
    <StaffDetails staff={staff} stats={stats} upcoming={upcoming} recent={recent} history={history} activity={activity} self={staff.userId === session?.user.id} />
  );
}
