import { Card, CardContent } from "@/components/ui/card";
import { eachMonthOfInterval, startOfMonth, subMonths, format } from "date-fns";
import Chart from "./Chart";
import WeeklyPayments from "./WeeklyPayments";
import WeeklyTrainings from "./WeeklyTrainings";
import { formatCurrency } from "@/utils/TansformWords";
import { AppRole } from "@/components/SideBarItems";

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
            <StatCard label="Total Players" value={data.totalPlayers} />
            <StatCard label="Total Coaches" value={data.totalCoaches} />
            <StatCard
              label="Trainings This Week"
              value={data.totalWeeklyTainings}
            />
            <StatCard
              label="Payments This Week"
              value={data.totalWeeklyPayments}
              isCurrency
            />
            <StatCard label="Total Guardians" value={data.guardianCount} />
            <StatCard
              label="Total Revenue"
              value={data.totalFinances._sum.amountPaid || 0}
              isCurrency
            />
          </>
        ) : (
          <>
            <StatCard
              label="My Trainings This Week"
              value={data.totalWeeklyTainings}
            />
            <StatCard label="My Sessions" value={data.totalPlayers || 0} />
            <StatCard label="Attendance Rate" value={85} isPercentage />
            <StatCard
              label="Upcoming Events"
              isCurrency
              value={data.totalWeeklyPayments || 0}
            />
          </>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Chart data={yearlyIncome} />
            <div className="flex items-center justify-center border rounded-lg p-6">
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

const StatCard = ({
  label,
  value,
  isCurrency = false,
  isPercentage = false,
}: {
  label: string;
  value: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
}) => {
  const displayValue = isCurrency
    ? formatCurrency(value)
    : isPercentage
      ? `${value}%`
      : value;

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{displayValue}</p>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
