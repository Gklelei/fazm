"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
  CheckCircle,
  TrendingUp,
  Target,
  BarChart3,
  Sparkles,
} from "lucide-react";

import { GetStaffByIdQueryType } from "../types";

/* ----------------------------- helpers (top-level) ---------------------------- */

function formatDate(dateString: string) {
  return format(new Date(dateString), "MMM dd, yyyy");
}

// function formatTime(dateString: string) {
//   return format(new Date(dateString), "hh:mm a");
// }

function getStatusBadge(status: string) {
  const base = "border-transparent";
  switch (status) {
    case "SCHEDULED":
      return (
        <Badge className={`${base} bg-blue-100 text-blue-700`}>Scheduled</Badge>
      );
    case "COMPLETED":
      return (
        <Badge className={`${base} bg-green-100 text-green-700`}>
          Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className={`${base} bg-red-100 text-red-700`}>Cancelled</Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge className={`${base} bg-amber-100 text-amber-700`}>
          In Progress
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function initialsFromName(name?: string) {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

/* ----------------------------- small UI components ---------------------------- */

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {value}
            </div>
            {hint ? (
              <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-background p-2.5">{icon}</div>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-muted/40" />
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border bg-background p-2">{icon}</div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/* --------------------------------- main page -------------------------------- */

const StaffViewPage = ({ staff }: { staff: GetStaffByIdQueryType }) => {
  const router = useRouter();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = new Date();
  const trainings = useMemo(() => staff.trainings ?? [], [staff.trainings]);

  const upcoming = useMemo(
    () =>
      trainings
        .filter((t) => new Date(t.date) > now && t.status === "SCHEDULED")
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [trainings, now],
  );

  const pastOrOther = useMemo(
    () =>
      trainings
        .filter((t) => t.status !== "SCHEDULED" || new Date(t.date) <= now)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [trainings, now],
  );
  if (!staff) return null;

  const totalTrainings = trainings.length;
  const upcomingTrainings = upcoming.length;
  const completedTrainings = trainings.filter(
    (t) => t.status === "COMPLETED",
  ).length;

  const avgTrainingDuration =
    totalTrainings > 0
      ? Math.round(
          trainings.reduce((acc, t) => acc + t.duration, 0) / totalTrainings,
        )
      : 0;

  const totalTrainingHours = Math.round(
    trainings.reduce((acc, t) => acc + t.duration, 0) / 60,
  );

  const completionRate =
    totalTrainings > 0
      ? Math.round((completedTrainings / totalTrainings) * 100)
      : 0;

  const initials = initialsFromName(staff.fullNames);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Badge variant="secondary" className="hidden md:inline-flex">
              Staff Profile
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Staff Details
          </h1>
          <p className="text-muted-foreground">
            View training activity and contact information.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-muted text-foreground border" variant="outline">
            Completion: {completionRate}%
          </Badge>
        </div>
      </div>

      {/* Profile */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border">
                <AvatarImage
                  src={staff.user.image || ""}
                  alt={staff.fullNames}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {staff.fullNames}
                  </h2>
                  <Badge
                    variant={
                      staff.user.role === "COACH" ? "default" : "secondary"
                    }
                    className="capitalize"
                  >
                    {staff.user.role.toLowerCase()}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:gap-4">
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    ID:{" "}
                    <span className="text-foreground/80">{staff.staffId}</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-foreground/80">
                      {staff.user.email}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-foreground/80">
                      {staff.phoneNumber}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 lg:text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Member Since
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatDate(String(staff.user.createdAt))}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Profile active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {staff.user.role === "COACH" && (
        <>
          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Overview */}
            <Card className="lg:col-span-4">
              <CardHeader className="pb-2">
                <SectionTitle
                  icon={<BarChart3 className="h-4 w-4" />}
                  title="Training Overview"
                  subtitle="Completion and workload summary."
                />
              </CardHeader>

              <CardContent className="pt-2">
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total sessions
                      </span>
                      <span className="text-lg font-semibold">
                        {totalTrainings}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-full rounded-full bg-primary" />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-lg font-semibold text-green-700">
                          {completedTrainings}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Completed
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-lg font-semibold text-blue-700">
                          {upcomingTrainings}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Upcoming
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background p-3 text-center">
                        <div className="text-lg font-semibold">
                          {completionRate}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Rate
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-background p-4">
                      <div className="text-2xl font-semibold">
                        {totalTrainingHours}h
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total hours
                      </div>
                    </div>
                    <div className="rounded-xl border bg-background p-4">
                      <div className="text-2xl font-semibold">
                        {avgTrainingDuration}m
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg duration
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total Trainings"
                  value={totalTrainings}
                  icon={<Calendar className="h-5 w-5" />}
                  hint="All assigned sessions"
                />
                <StatCard
                  label="Upcoming"
                  value={upcomingTrainings}
                  icon={<TrendingUp className="h-5 w-5" />}
                  hint="Scheduled in future"
                />
                <StatCard
                  label="Completed"
                  value={completedTrainings}
                  icon={<CheckCircle className="h-5 w-5" />}
                  hint="Finished sessions"
                />
                <StatCard
                  label="Assessments"
                  value={staff.assessments.length}
                  icon={<Target className="h-5 w-5" />}
                  hint="Submitted evaluations"
                />
              </div>
            </div>
          </div>{" "}
          {/* Sessions */}
          <Card>
            <CardHeader className="space-y-3">
              <SectionTitle
                icon={<Calendar className="h-4 w-4" />}
                title="Training Sessions"
                subtitle="Upcoming first, then previous sessions."
                right={
                  totalTrainings > 0 ? (
                    <Badge variant="outline" className="border bg-muted/20">
                      {totalTrainings} total
                    </Badge>
                  ) : null
                }
              />
              <Separator />
            </CardHeader>

            <CardContent>
              {totalTrainings === 0 ? (
                <div className="grid place-items-center gap-2 py-14 text-center text-muted-foreground">
                  <Calendar className="h-14 w-14 opacity-50" />
                  <div className="text-base font-medium text-foreground">
                    No Training Sessions
                  </div>
                  <div className="text-sm">
                    This staff member has no assigned sessions.
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Upcoming */}
                  {upcoming.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Upcoming
                      </div>

                      <div className="space-y-3">
                        {upcoming.map((training) => (
                          <div
                            key={training.id}
                            className="group rounded-xl border bg-background p-4 transition hover:bg-muted/20"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-start gap-4">
                                <div className="w-14 rounded-xl border bg-muted/20 p-2 text-center">
                                  <div className="text-xl font-semibold text-primary">
                                    {format(new Date(training.date), "dd")}
                                  </div>
                                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    {format(new Date(training.date), "EEE")}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-semibold">
                                      {training.name}
                                    </div>
                                    {getStatusBadge(training.status)}
                                  </div>

                                  {training.description ? (
                                    <div className="text-sm text-muted-foreground">
                                      {training.description}
                                    </div>
                                  ) : null}

                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(String(training.date))}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock className="h-4 w-4" />
                                      {training.duration} mins
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Past / other */}
                  {pastOrOther.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Past & Other
                      </div>

                      <div className="space-y-3">
                        {pastOrOther.map((training) => (
                          <div
                            key={training.id}
                            className="rounded-xl border bg-background p-4 transition hover:bg-muted/20"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-start gap-4">
                                <div className="w-14 rounded-xl border bg-muted/10 p-2 text-center">
                                  <div className="text-xl font-semibold text-muted-foreground">
                                    {format(new Date(training.date), "dd")}
                                  </div>
                                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    {format(new Date(training.date), "EEE")}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-semibold">
                                      {training.name}
                                    </div>
                                    {getStatusBadge(training.status)}
                                  </div>

                                  {training.description ? (
                                    <div className="text-sm text-muted-foreground">
                                      {training.description}
                                    </div>
                                  ) : null}

                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(String(training.date))}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock className="h-4 w-4" />
                                      {training.duration} mins
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StaffViewPage;
