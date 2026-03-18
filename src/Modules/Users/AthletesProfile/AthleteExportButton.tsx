"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GetAthleteByIdQueryType } from "../Types";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/TansformWords";

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function getLastY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY ?? fallback) as number;
}

function sectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  W: number,
  marginX: number,
) {
  doc.setFillColor(20, 30, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.rect(marginX, y, W - marginX * 2, 16, "F");
  doc.text(title.toUpperCase(), marginX + 8, y + 11);
  doc.setTextColor(0);
  return y + 16;
}

function posLabel(pos: unknown): string {
  if (!pos) return "—";
  if (Array.isArray(pos)) return pos.length ? pos.join(", ") : "—";
  return String(pos);
}

function displayName(data: GetAthleteByIdQueryType) {
  return [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(" ");
}

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function AthleteExportButton({
  data,
}: {
  data: GetAthleteByIdQueryType;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let y = 0;

      // ── Dark header banner ────────────────────────────────────────
      doc.setFillColor(20, 30, 48);
      doc.rect(0, 0, W, 80, "F");

      // Athlete photo (or placeholder circle)
      const photoSrc = data.profilePIcture;
      let photoAdded = false;
      if (photoSrc) {
        const dataUrl = await loadImageAsDataUrl(photoSrc);
        if (dataUrl) {
          const ext = photoSrc.toLowerCase().includes(".png") ? "PNG" : "JPEG";
          doc.addImage(dataUrl, ext, marginX, 8, 64, 64, undefined, "FAST");
          photoAdded = true;
        }
      }
      if (!photoAdded) {
        // Draw placeholder circle
        doc.setFillColor(50, 65, 90);
        doc.circle(marginX + 32, 40, 32, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(180, 200, 230);
        const initials = [data.firstName?.[0], data.lastName?.[0]]
          .filter(Boolean)
          .join("")
          .toUpperCase();
        doc.text(initials || "?", marginX + 32, 44, { align: "center" });
      }

      // Name & subtitle
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(displayName(data) || "Unnamed Athlete", marginX + 80, 34);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 200, 230);
      doc.text(
        `ID: ${safeText(data.athleteId)}   •   Status: ${safeText(data.status)}`,
        marginX + 80,
        50,
      );
      doc.text(`Generated: ${new Date().toLocaleString()}`, W - marginX, 26, {
        align: "right",
      });

      y = 96;

      // ── Personal Information ──────────────────────────────────────
      y = sectionTitle(doc, "Personal Information", y, W, marginX);

      const personalRows = [
        ["Full Name", displayName(data)],
        ["Athlete ID", safeText(data.athleteId)],
        ["Email", safeText(data.email)],
        ["Phone", safeText(data.phoneNumber)],
        ["Age", safeText(data.age)],
        ["Positions", posLabel(data.positions)],
        [
          "Member Since",
          data.createdAt
            ? format(new Date(data.createdAt), "dd MMM yyyy")
            : "—",
        ],
      ];

      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        theme: "plain",
        body: personalRows,
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: 80, cellWidth: 130 },
          1: { cellWidth: "auto" },
        },
        alternateRowStyles: { fillColor: [248, 249, 252] },
      });

      y = getLastY(doc, y) + 14;

      // ── Address ───────────────────────────────────────────────────
      if (data.address) {
        y = sectionTitle(doc, "Address", y, W, marginX);
        const addr = data.address as Record<string, unknown>;
        autoTable(doc, {
          startY: y,
          margin: { left: marginX, right: marginX },
          theme: "plain",
          body: [
            ["Street", safeText(addr.street)],
            ["City", safeText(addr.city)],
            ["County / State", safeText(addr.county ?? addr.state)],
            ["Country", safeText(addr.country)],
          ],
          styles: { fontSize: 9, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: 80, cellWidth: 130 },
            1: { cellWidth: "auto" },
          },
          alternateRowStyles: { fillColor: [248, 249, 252] },
        });
        y = getLastY(doc, y) + 14;
      }

      // ── Guardians ─────────────────────────────────────────────────
      if (data.guardians?.length) {
        y = sectionTitle(doc, "Guardians", y, W, marginX);
        autoTable(doc, {
          startY: y,
          margin: { left: marginX, right: marginX },
          theme: "striped",
          head: [["Name", "Email", "Phone", "Relationship"]],
          body: data.guardians.map((g) => [
            safeText(g.fullNames),
            safeText(g.email),
            safeText(g.phoneNumber),
            safeText(g.relationship),
          ]),
          styles: {
            fontSize: 8.5,
            cellPadding: 5,
            lineColor: 220,
            lineWidth: 0.5,
          },
          headStyles: {
            fillColor: [240, 244, 250],
            textColor: 30,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [252, 253, 255] },
        });
        y = getLastY(doc, y) + 14;
      }

      // ── Medical ───────────────────────────────────────────────────
      if (data.medical) {
        const med = data.medical as Record<string, unknown>;
        y = sectionTitle(doc, "Medical Information", y, W, marginX);
        autoTable(doc, {
          startY: y,
          margin: { left: marginX, right: marginX },
          theme: "plain",
          body: [
            ["Blood Group", safeText(med.bloodGroup)],
            ["Allergies", safeText(med.allergies)],
            [
              "Medical Conditions",
              safeText(med.conditions ?? med.medicalConditions),
            ],
            ["Notes", safeText(med.notes)],
          ],
          styles: { fontSize: 9, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: 80, cellWidth: 130 },
            1: { cellWidth: "auto" },
          },
          alternateRowStyles: { fillColor: [248, 249, 252] },
        });
        y = getLastY(doc, y) + 14;
      }

      // ── New page for financials ───────────────────────────────────
      if (y > doc.internal.pageSize.getHeight() - 150) {
        doc.addPage();
        y = 40;
      }

      // ── Financials ────────────────────────────────────────────────
      y = sectionTitle(doc, "Payment History", y, W, marginX);
      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        theme: "striped",
        head: [["#", "Amount Paid", "Date", "Receipt #", "Method"]],
        body:
          data.finances.length === 0
            ? [["—", "No payments recorded", "", "", ""]]
            : data.finances.map((f, i) => [
                String(i + 1),
                `KES ${Number(f.amountPaid).toLocaleString()}`,
                format(new Date(f.paymentDate), "dd MMM yyyy"),
                safeText(f.receiptNumber),
                safeText(f.paymentType),
              ]),
        styles: {
          fontSize: 8.5,
          cellPadding: 5,
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
          0: { cellWidth: 24, halign: "center" },
          1: { cellWidth: 110 },
          2: { cellWidth: 90 },
          3: { cellWidth: "auto" },
          4: { cellWidth: 80 },
        },
      });

      y = getLastY(doc, y) + 14;

      // ── Invoices ──────────────────────────────────────────────────
      if (y > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
        y = 40;
      }

      y = sectionTitle(doc, "Invoices", y, W, marginX);
      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        theme: "striped",
        head: [
          ["#", "Invoice #", "Plan", "Amount Due", "Paid", "Balance", "Status"],
        ],
        body:
          data.invoices.length === 0
            ? [["—", "No invoices", "", "", "", "", ""]]
            : data.invoices.map((inv, i) => {
                const due = Number(inv.amountDue ?? 0);
                const paid = Number(inv.amountPaid ?? 0);
                const disc = Number(
                  (inv as Record<string, unknown>).discount ?? 0,
                );
                const balance = Math.max(due - disc - paid, 0);
                return [
                  String(i + 1),
                  safeText(inv.invoiceNumber),
                  safeText(inv.subscriptionPlan?.name),
                  `KES ${formatCurrency(due)}`,
                  `KES ${formatCurrency(paid)}`,
                  `KES ${formatCurrency(balance)}`,
                  safeText(inv.status),
                ];
              }),
        styles: { fontSize: 8, cellPadding: 5, lineColor: 220, lineWidth: 0.5 },
        headStyles: {
          fillColor: [240, 244, 250],
          textColor: 30,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [252, 253, 255] },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 55 },
        },
      });

      y = getLastY(doc, y) + 14;

      // ── Assessments ───────────────────────────────────────────────
      if (data.assessments.length > 0) {
        doc.addPage();
        y = 40;

        y = sectionTitle(doc, "Performance Assessments", y, W, marginX);

        for (const asmt of data.assessments) {
          // Sub-heading per assessment
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(40);
          doc.text(
            `${safeText(asmt.training.name)}  •  ${format(new Date(asmt.training.date), "dd MMM yyyy")}  •  Coach: ${safeText(asmt.coach.fullNames)}`,
            marginX,
            y + 10,
          );
          y += 16;

          const body =
            asmt.responses.length > 0
              ? asmt.responses.map((r) => [
                  safeText(r.metric.label),
                  safeText(r.grade).replace(/_/g, " "),
                ])
              : [["No grades recorded", "—"]];

          autoTable(doc, {
            startY: y,
            margin: { left: marginX, right: marginX },
            theme: "striped",
            head: [["Metric", "Grade"]],
            body,
            styles: {
              fontSize: 8.5,
              cellPadding: 5,
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
              1: { cellWidth: 120, fontStyle: "bold" },
            },
          });

          y = getLastY(doc, y) + 4;

          // Coach comment
          if (asmt.comment) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8.5);
            doc.setTextColor(80);
            doc.text(
              `Comment: "${safeText(asmt.comment)}"`,
              marginX + 4,
              y + 10,
              {
                maxWidth: W - marginX * 2 - 8,
              },
            );
            y += 18;
          }

          y += 10;

          if (y > doc.internal.pageSize.getHeight() - 120) {
            doc.addPage();
            y = 40;
          }
        }
      }

      // ── Save ──────────────────────────────────────────────────────
      doc.save(`${safeText(data.athleteId) || "athlete"}_profile.pdf`);
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
