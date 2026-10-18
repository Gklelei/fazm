import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardCheck, ClipboardList, Dumbbell, MapPin, Pencil, Phone, User, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { GetAllTrainingSessionsByIdQueryType } from "@/features/assessments/queries";
import { GRADES } from "@/features/assessments/lib/grades";
import { academyHHmm, formatAcademy } from "@/lib/academy-time";
import { formatPhone } from "@/lib/phone";
import { SessionPdfButton } from "./SessionPdfButton";
import { AttendanceRoster } from "./AttendanceRoster";

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");
const lengthOf = (m: number) => (m % 60 ? `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h ` : ""}${m % 60} min` : `${m / 60} h`);

function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <Card className="border-none bg-muted/40 shadow-none">
      <CardContent className="flex flex-col items-center p-4 text-center">
        <span className="text-xs tracking-wider text-muted-foreground uppercase">{label}</span>
        <span className="tabular text-2xl font-bold">{value}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardContent>
    </Card>
  );
}

/** One response as it reads: "First touch · Very good", "30 m sprint · 5.1 s". */
function result(r: { grade: string | null; value: unknown; metric: { label: string; kind: string; unit: string | null } }) {
  const score = r.grade ? GRADES.find((g) => g.value === r.grade)?.label : r.value != null ? `${Number(r.value)}${r.metric.unit ? ` ${r.metric.unit}` : ""}` : null;
  return `${r.metric.label} · ${score ?? "—"}`;
}

export default function ViewTrainingSession({ data }: { data: GetAllTrainingSessionsByIdQueryType }) {
  const marks = new Map(data.attendances.map((a) => [a.athleteId, a]));
  const present = data.attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const byId = new Map(data.drills.map((d) => [d.id, d]));
  // Drills follow the coach's chosen order when one was saved
  const drills = data.drillOrder.length ? data.drillOrder.flatMap((id) => byId.get(id) ?? []) : data.drills;
  const names = new Map(data.athletes.map((a) => [a.athleteId, `${a.firstName} ${a.lastName}`]));
  const end = new Date(new Date(data.date).getTime() + data.duration * 60_000);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/sessions">
          <ArrowLeft /> Sessions
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{data.name}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.description || "No description provided."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SessionPdfButton data={data} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sessions/edit/${data.id}`}>
              <Pencil /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/assesments/${data.id}/mark`}>
              <ClipboardCheck /> Assess
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/sessions/attendance/mark/${data.id}`}>
              <UserCheck /> Take attendance
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <Card className="gap-3 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <CalendarDays className="size-4 text-muted-foreground" /> Session details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Detail label="Date">{formatAcademy(data.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</Detail>
            <Detail label="Time">
              {academyHHmm(data.date)} – {academyHHmm(end)}
            </Detail>
            <Detail label="Duration">{lengthOf(data.duration)}</Detail>
            <Detail label="Location">
              <span className="flex items-center gap-1">
                <MapPin className="size-3 shrink-0" /> {data.location.name}
              </span>
            </Detail>
            <Detail label="Batch" className="col-span-2">
              <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                {data.batch.name}
                {data.batch.description && <span className="font-normal text-muted-foreground sm:ml-1 sm:border-l sm:pl-2">{data.batch.description}</span>}
              </span>
            </Detail>
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <User className="size-4 text-muted-foreground" /> Coach in charge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Link href={`/staff/${data.coach.staffId}`} className="flex items-center gap-3 hover:underline">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-bold text-muted-foreground">{data.coach.fullNames.charAt(0)}</span>
              <span className="min-w-0">
                <span className="block font-medium">{data.coach.fullNames}</span>
                <span className="block text-xs text-muted-foreground">{data.coach.staffId}</span>
              </span>
            </Link>
            {data.coach.phoneNumber && (
              <>
                <Separator />
                <a href={`tel:${data.coach.phoneNumber}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Phone className="size-3 shrink-0" /> {formatPhone(data.coach.phoneNumber)}
                </a>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Total athletes" value={data.athletes.length} />
        <Stat label="Present" value={present} note={data.attendances.length ? `of ${data.attendances.length} marked` : "Not marked yet"} />
        <Stat label="Drills" value={drills.length} />
        <Stat label="Assessments" value={data.assessments.length} />
      </div>

      {/* Drills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Drills</h2>
        </div>
        {drills.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No drills have been assigned to this session.{" "}
              <Link href={`/sessions/edit/${data.id}`} className="font-medium text-primary hover:underline">
                Add drills
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            {drills.map((d, i) => (
              <Card key={d.id} className="gap-0 py-0 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <span className="tabular grid size-5 place-items-center rounded-full bg-primary/10 text-[0.7rem] font-bold text-primary">{i + 1}</span>
                    {d.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-muted-foreground">{d.description || "No description."}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Athlete attendance</h2>
          </div>
          <Card className="overflow-hidden py-0">
            {data.athletes.length === 0 ? (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">No athletes in this batch.</CardContent>
            ) : (
              <AttendanceRoster
                rows={data.athletes.map((a) => {
                  const m = marks.get(a.athleteId);
                  return {
                    athleteId: a.athleteId,
                    name: `${a.firstName} ${a.lastName}`,
                    status: m?.status ?? null,
                    reason: m?.reason?.label ? sentence(m.reason.label) : null,
                  };
                })}
              />
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Performance assessments</h2>
          </div>
          <Card className="overflow-hidden py-0">
            {data.assessments.length === 0 ? (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No assessments recorded yet.{" "}
                <Link href={`/assesments/${data.id}/mark`} className="font-medium text-primary hover:underline">
                  Assess
                </Link>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-40 pl-4">Athlete</TableHead>
                      <TableHead className="min-w-56">Results</TableHead>
                      <TableHead className="min-w-48 pr-4">Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.assessments.map((as) => (
                      <TableRow key={as.id}>
                        <TableCell className="pl-4 text-sm font-medium">
                          <Link href={`/players/user-profile/${as.athleteId}`} className="hover:underline">
                            {names.get(as.athleteId) ?? as.athleteId}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {as.responses.map((r) => (
                              <Badge key={r.id} variant="secondary" className="h-5 px-1.5 py-0 text-[10px] whitespace-nowrap">
                                {result(r)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="pr-4 text-xs whitespace-normal text-muted-foreground">{as.comment || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
