import { db } from "@/lib/prisma";

/** At-a-glance numbers for an athlete's profile header. */
export async function getAthleteSummary(athleteId: string) {
  const [attendance, owed, paid] = await Promise.all([
    db.attendance.groupBy({
      by: ["status"],
      where: { athleteId, training: { isArchived: false } },
      _count: { _all: true },
    }),
    db.invoice.aggregate({
      where: { athleteId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      _sum: { amountDue: true, amountPaid: true },
    }),
    db.finance.aggregate({
      where: { athleteId, isArchived: false },
      _sum: { amountPaid: true },
    }),
  ]);

  const count = (s: string) => attendance.find((a) => a.status === s)?._count._all ?? 0;
  const marked = attendance.reduce((n, a) => n + a._count._all, 0);
  const attended = count("PRESENT") + count("LATE");

  return {
    sessionsMarked: marked,
    attended,
    /** null until at least one session has been marked */
    attendanceRate: marked ? Math.round((attended / marked) * 100) : null,
    owed: Math.max(Number(owed._sum.amountDue ?? 0) - Number(owed._sum.amountPaid ?? 0), 0),
    paid: paid._sum.amountPaid ?? 0,
  };
}

export type AthleteSummary = Awaited<ReturnType<typeof getAthleteSummary>>;
