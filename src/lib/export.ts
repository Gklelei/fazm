"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Escape a value for CSV (handles commas, quotes, newlines).
 */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export data as a CSV file download.
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const csvContent = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${filename}.csv`);
}

/**
 * Export data as an Excel (.xlsx) file download.
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Auto-size columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => (r[i] || "").length),
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data as a PDF file download with a branded table layout.
 */
export function exportToPDF(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(filename, marginX, 40);

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    pageWidth - marginX,
    40,
    { align: "right" },
  );
  doc.setTextColor(0);

  // Table
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: rows,
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 6,
      lineColor: 230,
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [28, 33, 40],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Helper to trigger a file download from a Blob.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
