"use client";

import { useMemo, useState } from "react";
import { GetAssesmentMetricsQueryType } from "../Types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AssesmentMetricBuilder from "./CreateAssesmentMetric";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Search,
  Trash2Icon,
  RotateCcw,
  ListChecks,
  Inbox,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteAssessmentSection } from "../server/DeleteMetric";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";
import EditAssesmentMetric from "../server/EditAssesmentMetric";

interface Props {
  data: GetAssesmentMetricsQueryType[];
}

const AssesmentMetrics = ({ data }: Props) => {
  const [query, setQuery] = useState<string>("");
  const [metricId, setMetricId] = useState<string | undefined>(undefined);

  const filteredData = useMemo(() => {
    return data.filter((i) =>
      i.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [data, query]);

  const handleDelete = async (id: string) => {
    setMetricId(id);
    const result = await DeleteAssessmentSection(id);

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

    setMetricId(undefined);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Assessment Templates
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage the categories and specific metrics used for performance
            evaluations.
          </p>
        </div>
        <AssesmentMetricBuilder />
      </div>

      <Card className="shadow-sm border-muted overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by section name..."
                className="pl-9 bg-background focus-visible:ring-1 focus-visible:ring-primary transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Filters
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-17.5 pl-6">#</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Description
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Metrics
                  </TableHead>
                  <TableHead className="text-right pr-6 font-semibold text-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      className="group hover:bg-muted/10 transition-colors"
                    >
                      <TableCell className="pl-6 text-muted-foreground font-mono text-xs">
                        {String(idx + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-75 truncate text-muted-foreground text-sm italic">
                        {item.description || "No description provided"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="gap-1.5 font-medium bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors"
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          {item.metrics?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100">
                          <EditAssesmentMetric data={data} id={item.id} />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(item.id)}
                            disabled={metricId === item.id}
                          >
                            {metricId === item.id ? (
                              <Loader2 className="animate-spin mr-2 h-5 w-5" />
                            ) : (
                              <Trash2Icon className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Inbox className="w-8 h-8 opacity-20" />
                        <div>
                          <p className="font-medium">
                            No assessment sections found
                          </p>
                          <p className="text-xs">
                            Try adjusting your search or create a new section.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssesmentMetrics;
