"use client";

import * as React from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { formatDuration } from "@/utils/TansformWords";
import { GetAllTrainingSessionsByIdQueryType } from "../Assesments/Types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  CalendarDays,
  MapPin,
  Users,
  User,
  Phone,
  Dumbbell,
  ClipboardList,
  ArrowLeft,
  Download,
} from "lucide-react";
import { downloadTrainingSessionPdf } from "@/utils/pdf";

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setIsMobile(mq.matches);

    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

interface Props {
  data: GetAllTrainingSessionsByIdQueryType;
  present: number;
  count: number;
}

const ViewTrainingSession = ({ data, count, present }: Props) => {
  const router = useRouter();
  const isMobile = useIsMobile();

  const startTime = useMemo(() => {
    return new Date(data.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [data.date]);

  const endTime = useMemo(() => {
    const endDate = new Date(
      new Date(data.date).getTime() + data.duration * 60000,
    );
    return endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [data.date, data.duration]);

  const statsGridCols = isMobile ? "grid-cols-2" : "sm:grid-cols-4";
  const drillsCols = isMobile ? "grid-cols-1" : "md:grid-cols-3";

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="w-fit flex items-center gap-2 px-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Mobile: keep quick action visible */}
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTrainingSessionPdf(data)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight wrap-break-word">
            {data.name}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {data.description || "No description provided."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          {/* Desktop/tablet */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTrainingSessionPdf(data)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          )}

          <Badge
            variant={data.status === "SCHEDULED" ? "outline" : "secondary"}
            className="w-fit"
          >
            {data.status}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Session Details
            </CardTitle>
          </CardHeader>

          {/* Mobile: single column for readability */}
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Date</span>
              <span className="font-medium">
                {new Date(data.date).toDateString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Time</span>
              <span className="font-medium">
                {startTime} - {endTime}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Duration</span>
              <span className="font-medium">
                {formatDuration(data.duration)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Location</span>
              <span className="font-medium flex items-center gap-1 wrap-break-word">
                <MapPin className="h-3 w-3 shrink-0" /> {data.location.name}
              </span>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <span className="text-muted-foreground text-xs">Batch</span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium wrap-break-word">
                  {data.batch.name}
                </span>
                <span className="text-muted-foreground sm:border-l sm:pl-2 sm:ml-1 wrap-break-word">
                  {data.batch.description}
                </span>
              </div>
            </div>

            {/* Mobile: add print button near details too (big target) */}
            {isMobile && (
              <div className="sm:col-span-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadTrainingSessionPdf(data)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Coach in Charge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="font-bold text-muted-foreground">
                  {data.coach.fullNames.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium wrap-break-word">
                  {data.coach.fullNames}
                </p>
                <p className="text-xs text-muted-foreground wrap-break-word">
                  {data.coach.staffId}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-muted-foreground wrap-break-word">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{data.coach.phoneNumber}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className={`grid ${statsGridCols} gap-3 sm:gap-4`}>
        <Card className="bg-muted/40 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Total Athletes
            </span>
            <span className="text-2xl font-bold">{count}</span>
          </CardContent>
        </Card>

        <Card className="bg-muted/40 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Present
            </span>
            <span className="text-2xl font-bold">{present}</span>
          </CardContent>
        </Card>

        <Card className="bg-muted/40 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Drills
            </span>
            <span className="text-2xl font-bold">{data.drills.length}</span>
          </CardContent>
        </Card>

        <Card className="bg-muted/40 border-none shadow-none">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Assessments
            </span>
            <span className="text-2xl font-bold">
              {data.assessments.length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Drills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Drills</h2>
        </div>

        {data.drills.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No drills have been assigned to this session.
            </CardContent>
          </Card>
        ) : (
          <div className={`grid ${drillsCols} gap-3 sm:gap-4`}>
            {data.drills.map((drill) => (
              <Card key={drill.id} className="shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium wrap-break-word">
                    {drill.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground wrap-break-word">
                  {drill.description || "No description."}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Attendance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Athlete Attendance</h2>
          </div>

          <Card>
            {data.athletes.length === 0 ? (
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No athletes in this batch.
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.athletes.map((athlete, idx) => {
                      const attendance = data.attendances.find(
                        (a) => a.athleteId === athlete.athleteId,
                      );

                      return (
                        <TableRow key={athlete.id}>
                          <TableCell className="font-medium text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="min-w-55">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm wrap-break-word">
                                {[athlete.firstName, athlete.lastName]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground wrap-break-word">
                                {athlete.athleteId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                attendance?.status === "PRESENT"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {attendance?.status || "PENDING"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Assessments */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Performance Assessments</h2>
          </div>

          <Card>
            {data.assessments.length === 0 ? (
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No assessments recorded yet.
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-45">Athlete</TableHead>
                      <TableHead className="min-w-55">Grades</TableHead>
                      <TableHead className="min-w-60">Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assessments.map((assessment) => {
                      const athlete = data.athletes.find(
                        (a) => a.athleteId === assessment.athleteId,
                      );

                      return (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium text-sm wrap-break-word">
                            {athlete
                              ? `${athlete.firstName} ${athlete.lastName}`
                              : assessment.athleteId}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {assessment.responses.map((resp) => (
                                <Badge
                                  key={resp.id}
                                  variant="secondary"
                                  className="text-[10px] px-1 py-0 h-5 whitespace-nowrap"
                                >
                                  {resp.grade.replaceAll("_", " ")}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground wrap-break-word">
                            {assessment.responses
                              .map((r) => r.comment)
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewTrainingSession;
