"use client";

import { useMemo, useState, useTransition } from "react";
import { TrainingAttendanceType } from "../Types";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Save,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  Clock,
  XCircle,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  PenBoxIcon,
  Loader2Icon,
  ArrowLeftCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { saveAttendance } from "../Server/MarkAttendanceAction";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { useRouter } from "next/navigation";

const MarkAttendance = ({
  data,
  trainingId,
}: {
  data: TrainingAttendanceType;
  trainingId: string;
}) => {
  const utils = UseUtilsContext();
  const isEnoughAthletes = data.athletes.length > 0;
  const availableReasons = utils.data?.attendance || [];
  const [isLoading, startTransistion] = useTransition();
  const router = useRouter();
  const [attendanceState, setAttendanceState] = useState(() => {
    return data.athletes.map((athlete) => {
      const existing = data.attendances.find(
        (a) => a.athleteId === athlete.athleteId,
      );
      return {
        athleteId: athlete.athleteId,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        status: existing?.status || "ABSENT",
        reasonId: existing?.reason?.id || null,
      };
    });
  });

  const updateStatus = (
    athleteId: string,
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  ) => {
    setAttendanceState((prev) =>
      prev.map((item) =>
        item.athleteId === athleteId
          ? {
              ...item,
              status,
              reasonId: status === "PRESENT" ? null : item.reasonId,
            }
          : item,
      ),
    );
  };

  const updateReason = (athleteId: string, reasonId: string) => {
    setAttendanceState((prev) =>
      prev.map((item) =>
        item.athleteId === athleteId ? { ...item, reasonId } : item,
      ),
    );
  };

  const getStatusColor = (
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
  ) => {
    switch (status) {
      case "PRESENT":
        return "bg-primary/10 text-primary border-primary/20";
      case "ABSENT":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "LATE":
        return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "EXCUSED":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default:
        return "";
    }
  };

  const handleSave = async (coachId: string) => {
    startTransistion(async () => {
      const result = await saveAttendance(attendanceState, trainingId, coachId);

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message || "Success",
          title: "Success!",
        });
      } else {
        Sweetalert({
          icon: "error",
          text: result.message || "Failed",
          title: "An error has occurred",
        });
      }
    });
  };

  const stats = useMemo(
    () => [
      {
        label: "Total",
        value: attendanceState.length,
        icon: Users,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      },
      {
        label: "Present",
        value: attendanceState.filter((a) => a.status === "PRESENT").length,
        icon: CheckCircle2,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        label: "Absent",
        value: attendanceState.filter((a) => a.status === "ABSENT").length,
        icon: XCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
      {
        label: "Other",
        value: attendanceState.filter(
          (a) => !["PRESENT", "ABSENT"].includes(a.status),
        ).length,
        icon: AlertCircle,
        color: "text-blue-600",
        bgColor: "bg-blue-500/10",
      },
    ],
    [attendanceState],
  );

  return (
    <div className="container mx-auto py-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Training Attendance</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Session • Name:{data.name} • {attendanceState.length} athletes
            </p>
          </div>
        </div>

        <Button
          onClick={() => router.back()}
          disabled={isLoading || !isEnoughAthletes}
          className="gap-1.5 h-9"
        >
          <ArrowLeftCircle /> Back
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className={cn("text-lg font-bold", stat.color)}>
                    {stat.value}
                  </p>
                </div>
                <div className={cn("p-1.5 rounded", stat.bgColor)}>
                  <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base">Athlete Roster</CardTitle>
          <CardDescription className="text-xs">
            Update status and provide reasons
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-3 pl-4">Athlete</TableHead>
                <TableHead className="py-3 w-40">Status</TableHead>
                <TableHead className="py-3 w-55 pr-4">Reason</TableHead>
                <TableHead className="py-3 w-25 pr-2 hidden">
                  Assessment
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.athletes.length === 0 ? (
                <p className="text-center font-bold text-2xl text-muted-foreground mt-2 p-2">
                  No athletes added to this batch yet
                </p>
              ) : (
                attendanceState.map((athlete) => (
                  <TableRow key={athlete.athleteId} className="group">
                    <TableCell className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {athlete.firstName[0]}
                            {athlete.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {athlete.firstName} {athlete.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {athlete.athleteId}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Select
                        value={athlete.status}
                        onValueChange={(val) =>
                          updateStatus(
                            athlete.athleteId,
                            val as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
                          )
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-8 text-sm",
                            getStatusColor(athlete.status),
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="PRESENT"
                            className="text-sm flex items-center gap-1.5 py-1.5"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Present
                          </SelectItem>
                          <SelectItem
                            value="ABSENT"
                            className="text-sm flex items-center gap-1.5 py-1.5"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Absent
                          </SelectItem>
                          <SelectItem
                            value="LATE"
                            className="text-sm flex items-center gap-1.5 py-1.5"
                          >
                            <Clock className="h-3.5 w-3.5" /> Late
                          </SelectItem>
                          <SelectItem
                            value="EXCUSED"
                            className="text-sm flex items-center gap-1.5 py-1.5"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Excused
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="pr-4">
                      {athlete.status === "PRESENT" ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          <span>Present for training</span>
                        </div>
                      ) : (
                        <Select
                          value={athlete.reasonId || ""}
                          onValueChange={(val) =>
                            updateReason(athlete.athleteId, val)
                          }
                        >
                          <SelectTrigger className={cn("h-8 text-sm")}>
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableReasons
                              .filter((r) => r.status === athlete.status)
                              .map((reason) => (
                                <SelectItem
                                  key={reason.id}
                                  value={reason.id}
                                  className="text-sm py-1.5"
                                >
                                  {reason.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() =>
                          router.push(`/assesments/${athlete.athleteId}/mark`)
                        }
                      >
                        <PenBoxIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <Button
          onClick={() => handleSave(data.staffId)}
          disabled={isLoading || !isEnoughAthletes}
          className="gap-1.5 h-9"
        >
          <Save className="h-3.5 w-3.5" />
          {isLoading ? (
            <Loader2Icon className="h-2 w-2 animate-spin" />
          ) : (
            "Save Attendance Records"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MarkAttendance;
