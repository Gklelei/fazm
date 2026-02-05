import { Card } from "@/components/ui/card";
import { GetAthleteByIdQueryType } from "../Types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function getGradeColor(grade: string) {
  switch (grade) {
    case "EXCELLENT":
      return "text-green-600";
    case "VERY_GOOD":
      return "text-blue-600";
    case "GOOD":
      return "text-yellow-600";
    case "POOR":
      return "text-red-600";
    default:
      return "text-foreground";
  }
}

const AthleteAssesments = ({ data }: { data: GetAthleteByIdQueryType }) => {
  return (
    <Card>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12.5">#</TableHead>
              <TableHead>Training</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Assessment (Grade)</TableHead>
              <TableHead>Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.assessments.length > 0 ? (
              data.assessments.map((item, itemIdx) =>
                item.responses.map((response, respIdx) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {itemIdx + 1}.{respIdx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {item.training.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.training.date).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>{item.coach.fullNames}</TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {response.metric.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`font-bold text-sm ${getGradeColor(response.grade)}`}
                      >
                        {response.grade.replace("_", " ")}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-62.5 text-sm text-muted-foreground italic">
                      {response.comment ? `"${response.comment}"` : "—"}
                    </TableCell>
                  </TableRow>
                )),
              )
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No assessment data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default AthleteAssesments;
