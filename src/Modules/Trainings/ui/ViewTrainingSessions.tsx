"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, FormatParticipants } from "@/utils/TansformWords";

import { format } from "date-fns";
import { ArrowLeftCircle, Loader2Icon, MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteTrainingSession } from "../Server/DeleteTrainingSession";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import { GetAllTrainingSessionsQueryType } from "../Assesments/Types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  data: GetAllTrainingSessionsQueryType[];
}

const ViewTrainingSessions = ({ data }: Props) => {
  const router = useRouter();
  const [tId, setTid] = useState<string | undefined>(undefined);

  const handleDelete = async (id: string) => {
    setTid(id);

    const result = await DeleteTrainingSession(id);

    if (result.success) {
      Sweetalert({
        icon: "success",
        text: result.message,
        title: "Success!",
      });
    } else {
      Sweetalert({
        icon: "error",
        text: result.message,
        title: "An error has occurred",
      });
    }

    setTid(undefined);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle className="text-lg font-semibold">
          Training Sessions
        </CardTitle>

        <Button
          onClick={() => router.back()}
          variant="link"
          className="flex items-center gap-2 text-sm"
        >
          <ArrowLeftCircle className="h-4 w-4" />
          Back
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search & Create */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Input
            placeholder="Search training sessions"
            className="sm:max-w-sm"
          />
          <Button
            onClick={() => router.push("/training/sessions/create")}
            type="button"
          >
            Create Session
          </Button>
        </div>

        {/* Training Sessions Table */}
        <div className="overflow-x-auto">
          <Table className="min-w-full border border-border rounded-lg">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 py-2">#</TableHead>
                <TableHead className="max-w-xs py-2">Session</TableHead>
                <TableHead className="py-2">Date</TableHead>
                <TableHead className="text-right py-2">Duration</TableHead>
                <TableHead className="py-2">Status</TableHead>
                <TableHead className="py-2">Location</TableHead>
                <TableHead className="py-2">Coach</TableHead>
                <TableHead className="text-right py-2">Athletes</TableHead>
                <TableHead className="text-right py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((item, i) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/50 transition-colors duration-150"
                >
                  <TableCell className="text-muted-foreground py-2">
                    {i + 1}
                  </TableCell>

                  <TableCell className="font-medium py-2 truncate max-w-xs">
                    {item.name}
                  </TableCell>

                  <TableCell className="py-2">
                    <div className="flex flex-col leading-tight">
                      <span>{format(new Date(item.date), "MMM dd, yyyy")}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(item.date), "p")}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums py-2">
                    {formatDuration(item.duration)}
                  </TableCell>

                  <TableCell className="py-2">
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>

                  <TableCell className="py-2 truncate">
                    {item.location.name}
                  </TableCell>

                  <TableCell className="py-2">
                    <div className="flex flex-col leading-tight truncate">
                      <span>{item.coach.fullNames}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {item.coach.staffId}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums py-2">
                    {FormatParticipants(item._count.athletes)}
                  </TableCell>

                  <TableCell className="text-right py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/training/sessions/view/${item.id}`)
                          }
                        >
                          View Session
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/training/sessions/edit/${item.id}`)
                          }
                        >
                          Edit Session
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/assesments/${item.id}/mark`)
                          }
                          disabled={item.status !== "COMPLETED"}
                        >
                          Assessment
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          disabled={tId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          {tId === item.id ? (
                            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            "Delete Session"
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/training/sessions/attendance/mark/${item.id}`,
                            )
                          }
                          disabled={item.status !== "COMPLETED"}
                        >
                          Mark Attendance
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ViewTrainingSessions;
