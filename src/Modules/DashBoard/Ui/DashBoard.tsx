import { Card, CardContent } from "@/components/ui/card";
import { eachMonthOfInterval, startOfMonth, subMonths, format } from "date-fns";
import Chart from "./Chart";
import WeeklyPayments from "./WeeklyPayments";
import WeeklyTrainings from "./WeeklyTrainings";
import { formatCurrency } from "@/utils/TansformWords";
import { AppRole } from "@/components/SideBarItems";
import {
  Users,
  UserCheck,
  Dumbbell,
  DollarSign,
  Shield,
  TrendingUp,
  Calendar,
  Percent,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Dashboard = ({
  data,
  role,
}: {
  data: dashboardItems;
  role: AppRole | undefined;
}) => {
  const start = startOfMonth(subMonths(new Date(), 11));
  const now = new Date();

  const months = eachMonthOfInterval({ start, end: now });

  const yearlyIncome = months.map((m) => {
    const key = format(m, "yyyy-MM");

    const total = data.yearlyIncome
      .filter((p) => format(p.paymentDate, "yyyy-MM") === key)
      .reduce((acc, v) => acc + v.amountPaid, 0);

    return {
      month: format(m, "MMM yyyy"),
      total,
    };
  });

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Academy performance and activity summary
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard
              label="Total Players"
              value={data.totalPlayers}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Total Coaches"
              value={data.totalCoaches}
              icon={UserCheck}
              color="purple"
            />
            <StatCard
              label="Trainings This Week"
              value={data.totalWeeklyTainings}
              icon={Dumbbell}
              color="orange"
            />
            <StatCard
              label="Payments This Week"
              value={data.totalWeeklyPayments}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              label="Total Guardians"
              value={data.guardianCount}
              icon={Shield}
              color="indigo"
            />
            <StatCard
              label="Total Revenue"
              value={data.totalFinances._sum.amountPaid || 0}
              icon={TrendingUp}
              color="emerald"
              isCurrency
            />
          </>
        ) : (
          <>
            <StatCard
              label="My Trainings This Week"
              value={data.totalWeeklyTainings}
              icon={Dumbbell}
              color="orange"
            />
            <StatCard
              label="My Sessions"
              value={data.totalPlayers || 0}
              icon={Calendar}
              color="blue"
            />
            <StatCard
              label="Attendance Rate"
              value={85}
              icon={Percent}
              color="green"
              isPercentage
            />
            <StatCard
              label="Upcoming Events"
              value={data.totalWeeklyPayments || 0}
              icon={CalendarDays}
              color="purple"
            />
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Chart data={yearlyIncome} />
            <div className="items-center justify-center border rounded-lg p-6 hidden">
              <p className="text-muted-foreground">
                Additional chart or stats here
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyPayments data={data} />
            <WeeklyTrainings data={data} />
          </div>
        </>
      )}
    </div>
  );
};

const colorConfig = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    icon: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    icon: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/20",
    icon: "bg-green-500/10 text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color = "blue",
  isCurrency = false,
  isPercentage = false,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: keyof typeof colorConfig;
  isCurrency?: boolean;
  isPercentage?: boolean;
}) => {
  const displayValue = isCurrency
    ? formatCurrency(value)
    : isPercentage
      ? `${value}%`
      : value;

  const colors = colorConfig[color];

  return (
    <Card className={cn("border-2", colors.border)}>
      <CardContent className={cn("p-6", colors.bg)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight">{displayValue}</p>
          </div>
          <div className={cn("p-3 rounded-lg", colors.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
