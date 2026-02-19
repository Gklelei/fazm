import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProfileAvatar from "@/utils/profile/ProfileAvatar";
import {
  Calendar,
  Mail,
  Phone,
  Shield,
  Target,
  Activity,
  IdCard,
  Cake,
} from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";

type StatusConfig = {
  label: string;
  tone: string;
  message: string;
};

const STATUS: Record<string, StatusConfig> = {
  ACTIVE: {
    label: "Active",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
    message: "Eligible for training, attendance, and match activities.",
  },
  PENDING: {
    label: "Pending",
    tone: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
    message: "Registration is under review by the academy.",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
    message: "Account is restricted. Contact administration for support.",
  },
  DEACTIVATED: {
    label: "Deactivated",
    tone: "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-300 dark:border-zinc-800",
    message: "Account is currently disabled.",
  },
};

function safeStatus(raw?: string) {
  const s = (raw ?? "").trim().toUpperCase();
  if (s === "SUSPEND") return "SUSPENDED";
  return s || "PENDING";
}

function displayName(data: GetAthleteByIdQueryType) {
  return [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(" ");
}

function positionsLabel(pos: unknown) {
  if (!pos) return "—";
  if (Array.isArray(pos)) return pos.length ? pos.join(", ") : "—";
  return String(pos);
}

function valueOrDash(v: unknown) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

export default function PersonalInfo({
  data,
}: {
  data: GetAthleteByIdQueryType;
}) {
  const memberSince = new Date(data.createdAt ?? new Date()).getFullYear();
  const statusKey = safeStatus(data.status as unknown as string);
  const status = STATUS[statusKey] ?? STATUS.PENDING;

  const ageText = data.age ? data.age : "—";

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* LEFT: avatar + identity */}
          <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:w-72">
            <div className="shrink-0">
              <ProfileAvatar
                name={displayName(data)}
                url={data.profilePIcture || ""}
                size={96}
                className="ring-2 ring-border/60"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">
                {displayName(data) || "Unnamed athlete"}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Member since {memberSince}
                </Badge>

                <Badge variant="outline" className="gap-1 text-xs">
                  <Cake className="h-3 w-3" />
                  Age {ageText}
                </Badge>
              </div>
            </div>
          </div>

          {/* RIGHT: info tiles */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {/* Athlete ID */}
            <div className="rounded-xl border p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10">
                  <IdCard className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm font-semibold">Athlete ID</div>
              </div>
              <div className="font-mono text-sm font-bold tracking-wide">
                {valueOrDash(data.athleteId)}
              </div>
            </div>

            {/* Positions */}
            <div className="rounded-xl border p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm font-semibold">Positions</div>
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {positionsLabel(data.positions)}
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl border p-3 sm:p-4 sm:col-span-2 xl:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm font-semibold">Contact</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {valueOrDash(data.phoneNumber)}
                  </span>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {valueOrDash(data.email)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status (full width tile) */}
            <div className="rounded-xl border p-3 sm:p-4 sm:col-span-2 xl:col-span-3 bg-muted/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-sm font-semibold">Account status</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-semibold border", status.tone)}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {status.message}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
