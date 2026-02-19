import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { formatDuration } from "@/utils/TansformWords";
import { GetAllTrainingSessionsByIdQueryType } from "@/Modules/Trainings/Assesments/Types";

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function checkbox(checked: boolean) {
  // simple, printable checkboxes that work in PDF fonts
  return checked ? "☑" : "☐";
}

function statusFlags(status?: string) {
  const s = safeText(status).toUpperCase();
  return {
    present: s === "PRESENT",
    absent: s === "ABSENT",
    excused: s === "EXCUSED",
  };
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, x, y);
  doc.setDrawColor(220);
  doc.setLineWidth(1);
  doc.line(x, y + 6, doc.internal.pageSize.getWidth() - x, y + 6);
}

function getLastTableY(doc: jsPDF, fallback: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY ?? fallback) as number;
}

export function downloadTrainingSessionPdf(
  data: GetAllTrainingSessionsByIdQueryType,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 40;
  const topY = 40;

  const dateStr = new Date(data.date).toDateString();
  const startTime = new Date(data.date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endDate = new Date(
    new Date(data.date).getTime() + data.duration * 60000,
  );
  const endTime = endDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ---- Header (Title + Status pill-like text) ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(safeText(data.name) || "Training Session", marginX, topY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageWidth - marginX,
    topY,
    { align: "right" },
  );
  doc.setTextColor(0);

  const desc = safeText(data.description || "No description provided.");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(desc, marginX, topY + 18, { maxWidth: pageWidth - marginX * 2 });
  doc.setTextColor(0);

  // ---- Session details "card" (2 columns, key-value) ----
  // Use a table for consistent alignment instead of stacked text
  const detailsLeft: RowInput[] = [
    ["Status", safeText(data.status)],
    ["Date", dateStr],
    ["Time", `${startTime} - ${endTime}`],
    ["Duration", formatDuration(data.duration)],
  ];

  const detailsRight: RowInput[] = [
    ["Location", safeText(data.location?.name)],
    ["Batch", safeText(data.batch?.name)],
    ["Batch Notes", safeText(data.batch?.description)],
    [
      "Coach",
      `${safeText(data.coach?.fullNames)} (${safeText(data.coach?.staffId)})`,
    ],
    ["Coach Phone", safeText(data.coach?.phoneNumber)],
  ];

  const detailsY = topY + 34;
  const cardPadding = 10;

  // light card background
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(230);
  doc.roundedRect(
    marginX,
    detailsY,
    pageWidth - marginX * 2,
    150,
    10,
    10,
    "FD",
  );

  // two tables inside the card
  autoTable(doc, {
    startY: detailsY + cardPadding,
    margin: { left: marginX + cardPadding, right: pageWidth / 2 + 10 },
    tableWidth: (pageWidth - marginX * 2) / 2 - 15,
    theme: "plain",
    body: detailsLeft,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 2, valign: "top" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70, textColor: 80 },
      1: { cellWidth: "auto" },
    },
  });

  autoTable(doc, {
    startY: detailsY + cardPadding,
    margin: { left: pageWidth / 2, right: marginX + cardPadding },
    tableWidth: (pageWidth - marginX * 2) / 2 - 15,
    theme: "plain",
    body: detailsRight,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 2, valign: "top" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 80, textColor: 80 },
      1: { cellWidth: "auto" },
    },
  });

  let y = detailsY + 170;

  // ---- Drills ----
  drawSectionTitle(doc, "Drills", marginX, y);
  y += 18;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [["#", "Drill", "Description"]],
    body:
      data.drills.length === 0
        ? [["-", "No drills assigned", "-"]]
        : data.drills.map((d, idx) => [
            String(idx + 1),
            safeText(d.name),
            safeText(d.description || "No description."),
          ]),
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      lineColor: 235,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 243, 247],
      textColor: 30,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    columnStyles: {
      0: { cellWidth: 30, halign: "center" },
      1: { cellWidth: 170 },
      2: { cellWidth: "auto" },
    },
  });

  y = getLastTableY(doc, y) + 18;

  // ---- Assessments (keep before athletes) ----
  drawSectionTitle(doc, "Performance Assessments", marginX, y);
  y += 18;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [["Athlete", "Grades", "Comments"]],
    body:
      data.assessments.length === 0
        ? [["No assessments recorded yet", "-", "-"]]
        : data.assessments.map((ass) => {
            const athlete = data.athletes.find(
              (x) => x.athleteId === ass.athleteId,
            );
            const name = athlete
              ? `${athlete.firstName} ${athlete.lastName}`
              : safeText(ass.athleteId);

            const grades =
              ass.responses
                .map((r) => safeText(r.grade).replaceAll("_", " "))
                .join(", ") || "-";

            const comments =
              ass.responses
                .map((r) => safeText(r.comment))
                .filter(Boolean)
                .join(" | ") || "-";

            return [safeText(name), grades, comments];
          }),
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 6,
      lineColor: 235,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 243, 247],
      textColor: 30,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 170 },
      2: { cellWidth: "auto" },
    },
  });

  y = getLastTableY(doc, y) + 22;

  // If we’re too low, force next page so athletes start cleanly
  if (y > pageHeight - 180) {
    doc.addPage();
    y = topY;
  }

  // ---- Athletes LAST (long list) ----
  drawSectionTitle(doc, "Athlete Attendance", marginX, y);
  y += 18;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["#", "Athlete", "ID", "Attendance", "Reason / Notes"]],
    body:
      data.athletes.length === 0
        ? [["-", "No athletes in this batch", "-", "", ""]]
        : data.athletes.map((a, idx) => {
            const fullName =
              [a.firstName, a.lastName].filter(Boolean).join(" ") || "-";

            return [
              String(idx + 1),
              safeText(fullName),
              safeText(a.athleteId),
              "", // empty attendance column
              "", // empty reason column
            ];
          }),
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 8,
      lineColor: 200,
      lineWidth: 0.5,
      valign: "middle",
    },
    headStyles: {
      fillColor: [28, 33, 40],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: {
      0: { cellWidth: 26, halign: "center" },
      1: { cellWidth: 170 },
      2: { cellWidth: 80 },
      3: { cellWidth: 80 }, // Attendance (blank for manual marking)
      4: { cellWidth: "auto" }, // Reason / Notes (wide)
    },
  });

  const fileName = `training_${safeText(data.name).replaceAll(" ", "_")}_${new Date(
    data.date,
  )
    .toISOString()
    .slice(0, 10)}.pdf`;

  doc.save(fileName);
}
