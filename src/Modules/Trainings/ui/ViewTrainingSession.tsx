"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetAllTrainingSessionsByIdQueryType } from "../Assesments/Types";
import { formatDuration } from "@/utils/TansformWords";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  MapPin,
  Users,
  User,
  Phone,
  Dumbbell,
  ClipboardList,
} from "lucide-react";

interface Props {
  data: GetAllTrainingSessionsByIdQueryType;
  present: number;
  count: number;
}

const ViewTrainingSession = ({ data, count, present }: Props) => {
  const startTime = new Date(data.date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDate = new Date(
    new Date(data.date).getTime() + data.duration * 60000,
  );
  const endTime = endDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {data.description || "No description provided."}
          </p>
        </div>
        <Badge
          variant={data.status === "SCHEDULED" ? "outline" : "secondary"}
          className="w-fit"
        >
          {data.status}
        </Badge>
      </div>

      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
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
              <span className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {data.location.name}
              </span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-muted-foreground text-xs">Batch</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{data.batch.name}</span>
                <span className="text-muted-foreground border-l pl-2 ml-1">
                  {data.batch.description}
                </span>
              </div>
            </div>
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
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="font-bold text-muted-foreground">
                  {data.coach.fullNames.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium">{data.coach.fullNames}</p>
                <p className="text-xs text-muted-foreground">
                  {data.coach.staffId}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{data.coach.phoneNumber}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* DRILLS SECTION */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.drills.map((drill) => (
              <Card key={drill.id} className="shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {drill.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                  {drill.description || "No description."}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* TWO COLUMN TABLE LAYOUT (Athletes & Assessments) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ATHLETES TABLE */}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12.5">#</TableHead>
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
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {[athlete.firstName, athlete.lastName]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
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
            )}
          </Card>
        </div>

        {/* ASSESSMENTS TABLE */}
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
                      <TableHead>Athlete</TableHead>
                      <TableHead>Grades</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assessments.map((assessment) => {
                      const athlete = data.athletes.find(
                        (a) => a.athleteId === assessment.athleteId,
                      );
                      return (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium text-sm">
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
                                  {resp.grade.replace("_", " ")}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-37.5 truncate">
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
