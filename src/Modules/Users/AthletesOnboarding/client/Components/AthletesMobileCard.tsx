"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Loader2,
  MoreHorizontal,
  PenIcon,
  Trash2Icon,
  ChevronDown,
} from "lucide-react";

import ProfileImage from "@/utils/profile/ProfileAvatar";
import { cn } from "@/lib/utils";
import {
  AthleteRow,
  ageText,
  fullName,
  normalizeStatus,
  statusOptions,
} from "./athlete-utils";

interface Props {
  athlete: AthleteRow;
  deletingId: string;
  handleDeleteAthlete: (id: string) => void;
  handleChangeAthleteStatus: (params: {
    athleteId: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
  }) => void;
}

export default function AthletesMobileCard({
  athlete,
  deletingId,
  handleDeleteAthlete,
  handleChangeAthleteStatus,
}: Props) {
  const router = useRouter();
  const normalized = normalizeStatus(athlete.status);
  const statusConfig =
    statusOptions.find((s) => s.value === normalized) || statusOptions[0];
  const StatusIcon = statusConfig.Icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ProfileImage
              name={fullName(athlete)}
              size={44}
              url={athlete.profilePIcture || ""}
              className="border shadow-sm"
            />

            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">
                {fullName(athlete)}
                {ageText(athlete.age)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {athlete.email || "No email provided"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {athlete.positions?.length ? (
                  athlete.positions.slice(0, 3).map((pos, idx) => (
                    <Badge
                      key={`${athlete.id}-${pos}-${idx}`}
                      variant="secondary"
                      className="text-[10px] font-normal"
                    >
                      {pos}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No positions
                  </span>
                )}
                {athlete.positions?.length > 3 ? (
                  <Badge variant="outline" className="text-[10px]">
                    +{athlete.positions.length - 3}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/players/user-profile/${athlete.athleteId}`)
                }
                className="gap-2"
              >
                <Eye className="h-4 w-4" /> View profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  router.push(`/players/edit/${athlete.athleteId}`)
                }
                className="gap-2"
              >
                <PenIcon className="h-4 w-4" /> Edit
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>

              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() =>
                    handleChangeAthleteStatus({
                      athleteId: athlete.athleteId,
                      status: option.value,
                    })
                  }
                  className="gap-2 text-xs"
                >
                  <option.Icon
                    className={cn("h-4 w-4", option.color.split(" ")[0])}
                  />
                  {option.label}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 gap-2"
                disabled={deletingId === athlete.athleteId}
                onClick={() => handleDeleteAthlete(athlete.athleteId)}
              >
                {deletingId === athlete.athleteId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2Icon className="h-4 w-4" />
                )}
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <code className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-muted-foreground">
            {athlete.athleteId}
          </code>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-2 text-xs font-medium",
                  statusConfig.color,
                )}
              >
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">
                Change status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() =>
                    handleChangeAthleteStatus({
                      athleteId: athlete.athleteId,
                      status: option.value,
                    })
                  }
                  className="gap-2 text-xs"
                >
                  <option.Icon
                    className={cn("h-4 w-4", option.color.split(" ")[0])}
                  />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              router.push(`/players/user-profile/${athlete.athleteId}`)
            }
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => router.push(`/players/edit/${athlete.athleteId}`)}
          >
            <PenIcon className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
