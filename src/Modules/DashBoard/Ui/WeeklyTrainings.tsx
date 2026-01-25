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

const WeeklyTrainings = ({ data }: { data: dashboardItems }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Sessions This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {data.weeklyTrainings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No training sessions scheduled for this week.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
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
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{training.name}</TableCell>
                  <TableCell>
                    {training.date.toLocaleDateString()}{" "}
                    {training.date.toLocaleTimeString()}
                  </TableCell>
                  <TableCell>{formatDuration(training.duration)}</TableCell>
                  <TableCell>{training.location.name}</TableCell>
                  <TableCell>
                    {training.coach.fullNames} ({training.coach.staffId})
                  </TableCell>
                  <TableCell>
                    {FormatParticipants(training._count.athletes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyTrainings;
