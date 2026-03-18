"use client";

import { useMemo, useState } from "react";
import { GetAssesmentMetricsQueryType } from "../Types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AssesmentMetricBuilder from "./CreateAssesmentMetric";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import ServerPagination from "@/utils/ServerPagination";
import EditAssesmentMetric from "../server/EditAssesmentMetric";

interface Props {
  data: GetAssesmentMetricsQueryType[];
  page: number;
  limit: number;
  total: number;
}

const AssesmentMetrics = ({ data, page, limit, total }: Props) => {
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
    <>
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                // Generate PDF using jsPDF
                const doc = new jsPDF({ unit: "pt", format: "a4" });
                const W = doc.internal.pageSize.getWidth();
                const marginX = 40;
                let y = 40;

                // Title
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.setTextColor(20, 30, 48);
                doc.text("Assessment Template", W / 2, y, { align: "center" });
                y += 16;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text(
                  `Generated: ${new Date().toLocaleString()}`,
                  W / 2,
                  y + 8,
                  { align: "center" },
                );
                y += 28;

                // Grading key
                autoTable(doc, {
                  startY: y,
                  margin: { left: marginX, right: marginX },
                  theme: "plain",
                  head: [["Grading Scale", "", "", "", ""]],
                  body: [
                    [
                      "1 – Below Standard",
                      "2 – Needs Work",
                      "3 – Good",
                      "4 – Very Good",
                      "5 – Excellent",
                    ],
                  ],
                  styles: { fontSize: 8.5, cellPadding: 4 },
                  headStyles: {
                    fillColor: [240, 243, 248],
                    fontStyle: "bold",
                    textColor: 40,
                  },
                });

                y = ((doc as any).lastAutoTable?.finalY ?? y) + 14;

                // Sections
                for (const section of data) {
                  doc.setFillColor(28, 40, 60);
                  doc.setTextColor(255, 255, 255);
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(9);
                  doc.rect(marginX, y, W - marginX * 2, 16, "F");
                  doc.text(section.name.toUpperCase(), marginX + 8, y + 11);
                  doc.setTextColor(0);

                  autoTable(doc, {
                    startY: y + 16,
                    margin: { left: marginX, right: marginX },
                    theme: "striped",
                    head: [
                      [
                        "Metric",
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "Coach Notes / Comments",
                      ],
                    ],
                    body:
                      section.metrics.length > 0
                        ? section.metrics.map((m) => [
                            m.label,
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                          ])
                        : [["No metrics defined", "", "", "", "", "", ""]],
                    styles: {
                      fontSize: 8.5,
                      cellPadding: 6,
                      lineColor: 220,
                      lineWidth: 0.5,
                    },
                    headStyles: {
                      fillColor: [240, 244, 250],
                      textColor: 30,
                      fontStyle: "bold",
                    },
                    alternateRowStyles: { fillColor: [252, 253, 255] },
                    columnStyles: {
                      0: { cellWidth: "auto" },
                      1: { cellWidth: 22, halign: "center" },
                      2: { cellWidth: 22, halign: "center" },
                      3: { cellWidth: 22, halign: "center" },
                      4: { cellWidth: 22, halign: "center" },
                      5: { cellWidth: 22, halign: "center" },
                      6: { cellWidth: 120 },
                    },
                  });

                  y = ((doc as any).lastAutoTable?.finalY ?? y) + 12;

                  if (y > doc.internal.pageSize.getHeight() - 100) {
                    doc.addPage();
                    y = 40;
                  }
                }

                // Overall notes box
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(30);
                doc.text("Overall Comments & Notes:", marginX, y + 12);
                doc.setFillColor(250, 251, 253);
                doc.setDrawColor(210);
                doc.roundedRect(
                  marginX,
                  y + 18,
                  W - marginX * 2,
                  70,
                  4,
                  4,
                  "FD",
                );

                doc.save(
                  `assessment_template_${new Date().toISOString().slice(0, 10)}.pdf`,
                );
              }}
            >
              Export as PDF
            </Button>
            <AssesmentMetricBuilder />
          </div>
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
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
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
            <div className="p-4 border-t">
              <ServerPagination page={page} limit={limit} total={total} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AssesmentMetrics;
