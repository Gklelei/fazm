import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, FormatParticipants } from "@/utils/TansformWords";
import { formatDate } from "date-fns";
import { Dumbbell } from "lucide-react";

const WeeklyTrainings = ({ data }: { data: dashboardItems }) => {
  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Training Sessions This Week
          </CardTitle>
          <div className="p-3 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Dumbbell className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.weeklyTrainings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No training sessions scheduled for this week.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Athletes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeklyTrainings.map((training, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      {training.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <p>{formatDate(training.date, "dd/MM/yy")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(training.date, "HH:mm")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted">
                        {formatDuration(training.duration)}
                      </span>
                    </TableCell>
                    <TableCell>{training.location.name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {training.coach.fullNames}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {training.coach.staffId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                        {FormatParticipants(training._count.athletes)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyTrainings;
