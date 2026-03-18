"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Metric = { id: string; label: string };
type Section = { id: string; name: string; metrics: Metric[] };

type Props = {
  athleteName: string;
  athleteId: string;
  trainingName: string;
  trainingDate: string;
  coachName: string;
  comment: string | null;
  sections: Section[];
  scores: Record<string, string>;
};

const GRADE_MAP: Record<string, string> = {
  "1": "Below Standard",
  "2": "Needs Work",
  "3": "Good",
  "4": "Very Good",
  "5": "Excellent",
  BELOW_STANDARD: "Below Standard",
  NEEDS_WORK: "Needs Work",
  GOOD: "Good",
  VERY_GOOD: "Very Good",
  EXCELLENT: "Excellent",
};

const gradeLabel = (g: string) => GRADE_MAP[g] ?? g;

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function getLastY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY ?? fallback) as number;
}

export default function PrintCompletedAssessment({
  athleteName,
  athleteId,
  trainingName,
  trainingDate,
  coachName,
  comment,
  sections,
  scores,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let y = 40;

      // ── Header bar ──────────────────────────────────────────────
      doc.setFillColor(20, 30, 48);
      doc.rect(0, 0, W, 60, "F");

      // // Logo placeholder circle
      // doc.setFillColor(255, 255, 255);
      // doc.setDrawColor(255, 255, 255);
      // doc.circle(marginX + 18, 30, 18, "F");
      // doc.setTextColor(20, 30, 48);
      // doc.setFont("helvetica", "bold");
      // doc.setFontSize(7);
      // doc.text("LOGO", marginX + 18, 32, { align: "center" });

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("ATHLETE ASSESSMENT REPORT", marginX + 46, 28);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(200, 215, 235);
      doc.text("Official Performance Evaluation Document", marginX + 46, 42);

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, W - marginX, 28, {
        align: "right",
      });

      y = 80;

      // ── Athlete info card ────────────────────────────────────────
      doc.setFillColor(247, 249, 252);
      doc.setDrawColor(220, 225, 235);
      doc.roundedRect(marginX, y, W - marginX * 2, 72, 6, 6, "FD");

      const infoLeft = [
        ["Athlete Name", safeText(athleteName)],
        ["Athlete ID", safeText(athleteId)],
        ["Coach", safeText(coachName)],
      ];
      const infoRight = [
        ["Training Session", safeText(trainingName)],
        ["Date", safeText(trainingDate)],
      ];

      autoTable(doc, {
        startY: y + 6,
        margin: { left: marginX + 8, right: W / 2 },
        tableWidth: (W - marginX * 2) / 2 - 16,
        theme: "plain",
        body: infoLeft,
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: 80, cellWidth: 90 },
          1: { cellWidth: "auto" },
        },
      });

      autoTable(doc, {
        startY: y + 6,
        margin: { left: W / 2, right: marginX + 8 },
        tableWidth: (W - marginX * 2) / 2 - 16,
        theme: "plain",
        body: infoRight,
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: 80, cellWidth: 100 },
          1: { cellWidth: "auto" },
        },
      });

      y += 84;

      // ── Sections & grades ────────────────────────────────────────
      for (const section of sections) {
        // Section heading band
        doc.setFillColor(28, 40, 60);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.rect(marginX, y, W - marginX * 2, 16, "F");
        doc.text(section.name.toUpperCase(), marginX + 8, y + 11);
        doc.setTextColor(0);

        const tableBody = section.metrics.map((metric) => [
          metric.label,
          scores[metric.id] ? gradeLabel(scores[metric.id]) : "—",
        ]);

        autoTable(doc, {
          startY: y + 16,
          margin: { left: marginX, right: marginX },
          theme: "striped",
          head: [["Metric", "Grade"]],
          body: tableBody.length > 0 ? tableBody : [["No metrics", "—"]],
          styles: {
            fontSize: 9,
            cellPadding: 6,
            lineColor: 220,
            lineWidth: 0.5,
          },
          headStyles: {
            fillColor: [240, 244, 250],
            textColor: 30,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [251, 252, 254] },
          columnStyles: {
            0: { cellWidth: "auto" },
            1: { cellWidth: 120, fontStyle: "bold" },
          },
        });

        y = getLastY(doc, y) + 14;

        // Add new page if not enough space
        if (y > doc.internal.pageSize.getHeight() - 160) {
          doc.addPage();
          y = 40;
        }
      }

      // ── Coach notes ──────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text("Coach Notes:", marginX, y + 14);
      y += 20;

      const noteText = safeText(comment) || "No comments provided.";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.setFillColor(250, 251, 253);
      doc.setDrawColor(210);
      doc.roundedRect(marginX, y, W - marginX * 2, 60, 4, 4, "FD");
      doc.text(noteText, marginX + 8, y + 16, {
        maxWidth: W - marginX * 2 - 16,
      });

      y += 76;

      // ── Signatures footer ────────────────────────────────────────
      const colW = (W - marginX * 2) / 3;

      // ensure enough space
      if (y > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
        y = 40;
      }

      doc.setDrawColor(180);
      doc.setLineWidth(0.5);

      // Coach
      doc.line(marginX + 10, y + 70, marginX + colW - 10, y + 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text("COACH SIGNATURE", marginX + colW / 2, y + 80, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(safeText(coachName), marginX + colW / 2, y + 91, {
        align: "center",
      });

      // Stamp (center)
      const stampX = marginX + colW + colW / 2;
      doc.setDrawColor(160);
      doc.setLineWidth(1.5);
      doc.circle(stampX, y + 42, 35, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.text("OFFICIAL", stampX, y + 39, { align: "center" });
      doc.text("STAMP", stampX, y + 49, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text("ACADEMY STAMP", stampX, y + 87, { align: "center" });

      // Technical Director
      const tdX = marginX + colW * 2;
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      doc.line(tdX + 10, y + 70, tdX + colW - 10, y + 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text("TECHNICAL DIRECTOR", tdX + colW / 2, y + 80, {
        align: "center",
      });

      // ── Save ────────────────────────────────────────────────────
      const fileName = `assessment_${safeText(athleteId)}_${safeText(trainingDate).replace(/\//g, "-")}.pdf`;
      doc.save(fileName);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export PDF
    </Button>
  );
}
