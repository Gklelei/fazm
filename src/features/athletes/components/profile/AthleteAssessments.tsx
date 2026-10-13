import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetAthleteByIdQueryType } from "@/features/athletes/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";

const GRADE_STYLES: Record<string, { label: string; className: string }> = {
  EXCELLENT: {
    label: "Excellent",
    className:
      "bg-success/10 text-success border-success/30  ",
  },
  VERY_GOOD: {
    label: "Very Good",
    className:
      "bg-info/10 text-info border-info/30  ",
  },
  GOOD: {
    label: "Good",
    className:
      "bg-warning/10 text-warning-foreground dark:text-warning border-warning/30  ",
  },
  NEEDS_WORK: {
    label: "Needs Work",
    className:
      "bg-warning/10 text-warning-foreground dark:text-warning border-warning/30  ",
  },
  BELOW_STANDARD: {
    label: "Below Standard",
    className:
      "bg-destructive/10 text-destructive border-destructive/30  ",
  },
  POOR: {
    label: "Poor",
    className:
      "bg-destructive/10 text-destructive border-destructive/30  ",
  },
};

function gradeInfo(grade: string) {
  return (
    GRADE_STYLES[grade] ?? {
      label: grade.replace(/_/g, " "), // Fix: replace ALL underscores, not just first
      className: "",
    }
  );
}

const AthleteAssesments = ({ data }: { data: GetAthleteByIdQueryType }) => {
  const hasAssessments = data?.assessments?.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-bold">Assessments</CardTitle>
          {hasAssessments && (
            <span className="ml-auto text-xs text-muted-foreground">
              {data.assessments.length} session
              {data.assessments.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-14 pl-4">#</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasAssessments ? (
                data.assessments.map((item, itemIdx) =>
                  item.responses.length > 0 ? (
                    item.responses.map((response, respIdx) => {
                      const { label, className } = gradeInfo(response.grade);
                      return (
                        <TableRow key={response.id}>
                          <TableCell className="pl-4 text-xs text-muted-foreground font-mono">
                            {itemIdx + 1}.{respIdx + 1}
                          </TableCell>

                          {/* Training: only on first response row for this assessment */}
                          {respIdx === 0 ? (
                            <TableCell rowSpan={item.responses.length}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-sm leading-tight">
                                  {item.training.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(item.training.date),
                                    "dd MMM yyyy",
                                  )}
                                </span>
                              </div>
                            </TableCell>
                          ) : null}

                          {/* Coach: only on first row */}
                          {respIdx === 0 ? (
                            <TableCell
                              rowSpan={item.responses.length}
                              className="text-sm"
                            >
                              {item.coach.fullNames}
                            </TableCell>
                          ) : null}

                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-normal text-xs"
                            >
                              {response.metric.label}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold border ${className}`}
                            >
                              {label}
                            </Badge>
                          </TableCell>

                          {/* Comment: only on first row, spans all responses */}
                          {respIdx === 0 ? (
                            <TableCell
                              rowSpan={item.responses.length}
                              className="max-w-48 text-xs text-muted-foreground italic align-top pt-3"
                            >
                              {item.comment ? `"${item.comment}"` : "—"}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  ) : (
                    /* Assessment with no responses yet */
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-xs text-muted-foreground font-mono">
                        {itemIdx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm">
                            {item.training.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(item.training.date),
                              "dd MMM yyyy",
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.coach.fullNames}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="text-xs text-muted-foreground italic"
                      >
                        No grades recorded
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">
                        {item.comment ? `"${item.comment}"` : "—"}
                      </TableCell>
                    </TableRow>
                  ),
                )
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <ClipboardList className="h-7 w-7 opacity-20 mb-1" />
                      <p className="font-medium">No assessments found</p>
                      <p className="text-xs">
                        This athlete has not been assessed yet.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AthleteAssesments;
