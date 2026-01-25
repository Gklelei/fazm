import { Card, CardContent } from "@/components/ui/card";
import { eachMonthOfInterval, startOfMonth, subMonths, format } from "date-fns";
import Chart from "./Chart";
import WeeklyPayments from "./WeeklyPayments";
import WeeklyTrainings from "./WeeklyTrainings";
import { formatCurrency } from "@/utils/TansformWords";

const Dashboard = ({ data }: { data: dashboardItems }) => {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Academy performance and activity summary
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Players" value={data.totalPlayers} />
        <StatCard label="Total Coaches" value={data.totalCoaches} />
        <StatCard
          label="Trainings This Week"
          value={data.totalWeeklyTainings}
        />
        <StatCard label="Payments This Week" value={data.totalWeeklyPayments} />
        <StatCard label="Total Guardians" value={data.guardianCount} />
        <StatCard
          label="Total amount received"
          value={
            formatCurrency(
              data.totalFinances._sum.amountPaid || 0
            ) as unknown as number
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Chart data={yearlyIncome} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyPayments data={data} />
        <WeeklyTrainings data={data} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardContent className="p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

export default Dashboard;
