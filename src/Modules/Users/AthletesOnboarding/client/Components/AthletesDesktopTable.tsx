"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  athletes: AthleteRow[];
  deletingId: string;
  handleDeleteAthlete: (id: string) => void;
  handleChangeAthleteStatus: (params: {
    athleteId: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
  }) => void;
}

export default function AthletesDesktopTable({
  athletes,
  deletingId,
  handleDeleteAthlete,
  handleChangeAthleteStatus,
}: Props) {
  const router = useRouter();

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-12.5">#</TableHead>
            <TableHead className="w-20">Photo</TableHead>
            <TableHead>Athlete</TableHead>
            <TableHead>Positions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>ID</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {athletes.map((athlete, index) => {
            const normalized = normalizeStatus(athlete.status);
            const statusConfig =
              statusOptions.find((s) => s.value === normalized) ||
              statusOptions[0];
            const StatusIcon = statusConfig.Icon;

            return (
              <TableRow
                key={athlete.id}
                className="group hover:bg-muted/30 transition-colors"
              >
                <TableCell className="text-muted-foreground font-medium text-xs">
                  {index + 1}
                </TableCell>

                <TableCell>
                  <ProfileImage
                    name={fullName(athlete)}
                    size={40}
                    url={athlete.profilePIcture || ""}
                    className="border shadow-sm"
                  />
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                      {fullName(athlete)}
                    </span>
                    <span className="font-semibold text-sm">
                      {ageText(athlete.age)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-60">
                      {athlete.email || "No email provided"}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {athlete.positions?.length ? (
                      athlete.positions.map((pos, idx) => (
                        <Badge
                          key={`${athlete.id}-${pos}-${idx}`}
                          variant="secondary"
                          className="font-normal text-[10px] px-1.5"
                        >
                          {pos}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 gap-1 border text-[11px] font-medium",
                          statusConfig.color,
                        )}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                        <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start">
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
                            className={cn(
                              "w-4 h-4",
                              option.color.split(" ")[0],
                            )}
                          />
                          <span>{option.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>

                <TableCell>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground">
                    {athlete.athleteId}
                  </code>
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/players/user-profile/${athlete.athleteId}`,
                          )
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
