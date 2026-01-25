import { db } from "@/lib/prisma";
import Dashboard from "@/Modules/DashBoard/Ui/DashBoard";
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

const HomePage = async () => {
  const now = new Date();
  const start = startOfMonth(subMonths(now, 11));

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
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
  ] = await db.$transaction([
    db.athlete.count(),
    db.staff.count({
      // where: {
      //   role: "COACH",
      // },
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
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),

    db.training.findMany({
      where: {
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
  };
  return <Dashboard data={data} />;
};

export default HomePage;
