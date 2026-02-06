import { AppRole } from "@/components/SideBarItems";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Dashboard from "@/Modules/DashBoard/Ui/DashBoard";
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { headers } from "next/headers";

const HomePage = async () => {
  const now = new Date();
  const start = startOfMonth(subMonths(now, 11));

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const [
    totalPlayers,
    totalCoaches,
    monthlyRevenue,
    yearlyIncome,
    weeklyPayments,
    totalWeeklyPayments,
    totalWeeklyTainings,
    weeklyTrainings,
    guardianCount,
    totalFinances,
    invoices,
  ] = await db.$transaction([
    db.athlete.count({
      where: {
        isArchived: false,
      },
    }),

    db.user.count({
      where: {
        role: "COACH",
        isArchived: false,
      },
    }),
    db.finance.aggregate({
      _sum: { amountPaid: true },
      where: {
        paymentDate: {
          gte: startOfMonth(now),
          lte: endOfMonth(now),
        },
      },
    }),

    db.finance.findMany({
      where: {
        paymentDate: {
          gte: start,
        },
      },
      select: {
        amountPaid: true,
        paymentDate: true,
      },
    }),

    db.finance.findMany({
      where: {
        paymentDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        amountPaid: true,
        paymentType: true,
        receiptNumber: true,
        athlete: {
          select: {
            firstName: true,
            lastName: true,
            athleteId: true,
          },
        },
      },
    }),

    db.finance.count({
      where: {
        paymentDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),

    db.training.count({
      where: {
        isArchived: false,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),

    db.training.findMany({
      where: {
        isArchived: false,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        _count: {
          select: {
            athletes: true,
          },
        },
        coach: {
          select: {
            fullNames: true,
            staffId: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
        duration: true,
        date: true,
        name: true,
      },
    }),

    db.athleteGuardian.count(),
    db.finance.aggregate({
      _sum: {
        amountPaid: true,
      },
    }),
    db.invoice.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),
  ]);
  const data = {
    totalPlayers,
    totalCoaches,
    monthlyRevenue,
    yearlyIncome,
    weeklyPayments,
    totalWeeklyPayments,
    totalWeeklyTainings,
    weeklyTrainings,
    guardianCount,
    totalFinances,
    invoices,
  };

  return <Dashboard data={data} role={(session?.user.role as AppRole) || ""} />;
};

export default HomePage;
