"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { logExport } from "@/features/audit-logs/actions/log-export";
import { formatAcademy } from "@/lib/academy-time";

/** Every list download is recorded in the activity log; a failed log never blocks the download. */
const record = (what: string, format: "CSV" | "Excel" | "PDF", rows: number) =>
  void logExport({ what, format, rows }).catch(() => {});

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
  record(filename, "CSV", rows.length);
}

const MONEY = /^(?:KES|Ksh)\s?(-?[\d,]+(?:\.\d+)?)$/i;
// Plain numbers only: no leading zero (phone numbers stay text), not too long (IDs)
const NUMBER = /^-?(?:0|[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{0,10})(?:\.\d+)?$/;

/** A cell as Excel should hold it: money and numbers as numbers, the rest as text. */
export function excelCell(v: string): { v: string | number; money?: boolean } {
  const t = v.trim();
  const m = MONEY.exec(t);
  if (m) return { v: Number(m[1].replaceAll(",", "")), money: true };
  if (NUMBER.test(t)) return { v: Number(t.replaceAll(",", "")) };
  return { v };
}

/**
 * Export data as an Excel (.xlsx) file download: money and numbers stay
 * numbers (KES format), money columns get a total, the header row has filters.
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const cells = rows.map((r) => r.map(excelCell));
  // A money column: "KES 1,500" values, or plain numbers under a "(KES)" header
  const blank = (c?: { v: string | number }) => !c || c.v === "" || c.v === "—";
  const moneyCol = headers.map((h, i) =>
    /\b(KES|Ksh)\b/i.test(h)
      ? cells.some((r) => typeof r[i]?.v === "number") && cells.every((r) => typeof r[i]?.v === "number" || blank(r[i]))
      : cells.some((r) => r[i]?.money) && cells.every((r) => r[i]?.money || blank(r[i])),
  );
  const totals = moneyCol.some(Boolean)
    ? [headers.map((_, i) => (moneyCol[i] ? cells.reduce((sum, r) => sum + (typeof r[i]?.v === "number" ? (r[i].v as number) : 0), 0) : i === 0 ? "Total" : ""))]
    : [];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...cells.map((r) => r.map((c) => c.v)), ...totals]);

  // KES format on money columns, including the total
  for (let c = 0; c < headers.length; c++) {
    if (!moneyCol[c]) continue;
    for (let r = 1; r <= cells.length + totals.length; r++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") cell.z = '"KES" #,##0.00';
    }
  }
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: cells.length, c: headers.length - 1 } }) };

  // Auto-size columns
  worksheet["!cols"] = headers.map((h, i) => ({
    wch: Math.min(Math.max(h.length, ...rows.map((r) => (r[i] || "").length)) + 2, 50),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
  record(filename, "Excel", rows.length);
}

/**
 * Export data as a PDF file download with a branded table layout.
 */
export function exportToPDF(
  filename: string,
  headers: string[],
  rows: string[][],
  academyName?: string,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const top = academyName ? 14 : 0;

  // Academy name above the title
  if (academyName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(academyName.toUpperCase(), marginX, 32);
    doc.setTextColor(0);
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(filename, marginX, 40 + top);

  // Date (Nairobi time)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${formatAcademy(new Date(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`,
    pageWidth - marginX,
    40 + top,
    { align: "right" },
  );
  doc.setTextColor(0);

  // Table
  autoTable(doc, {
    startY: 60 + top,
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

  // Page numbers
  const pages = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, pageWidth / 2, pageHeight - 20, { align: "center" });
  }

  doc.save(`${filename}.pdf`);
  record(filename, "PDF", rows.length);
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
