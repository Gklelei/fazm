"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logExport } from "@/features/audit-logs/actions/log-export";
import type { ChecklistSection } from "./Checklist";

/** The blank assessment template, as the original Assessments page exported it. */
export function ExportTemplateButton({ sections }: { sections: ChecklistSection[] }) {
  return (
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

                y = ((doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 14;

                // Sections
                for (const section of sections) {
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
                            m.kind === "MEASURE" ? `${m.label} (${m.unit}, ${m.higherIsBetter ? "higher" : "lower"} is better)` : m.label,
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

                  y = ((doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;

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
                void logExport({ what: "assessment template", format: "PDF" }).catch(() => {});
      }}
    >
      <FileDown /> Export as PDF
    </Button>
  );
}
