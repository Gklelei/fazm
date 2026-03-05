"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Loader2,
} from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "./exportData";

interface ExportDropdownProps {
  filename: string;
  headers: string[];
  /** Rows currently loaded on-screen (fallback when no fetchAllUrl). */
  rows: string[][];
  /**
   * Optional API URL that returns ALL rows as JSON (e.g. "/api/export?resource=expenses").
   * When provided, the dropdown will fetch all data before exporting.
   */
  fetchAllUrl?: string;
  /**
   * Map each raw API item to a string[] row matching `headers`.
   * Required when `fetchAllUrl` is provided.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapRow?: (item: any, index: number) => string[];
}

export default function ExportDropdown({
  filename,
  headers,
  rows,
  fetchAllUrl,
  mapRow,
}: ExportDropdownProps) {
  const [loading, setLoading] = useState(false);

  /** Get the rows to export — either from the API or from the prop. */
  const getRows = async (): Promise<string[][]> => {
    if (!fetchAllUrl || !mapRow) return rows;

    setLoading(true);
    try {
      const res = await fetch(fetchAllUrl);
      if (!res.ok) throw new Error("Export fetch failed");
      const data = await res.json();
      return (data as unknown[]).map(mapRow);
    } catch (error) {
      console.error(
        "[ExportDropdown] fetch-all failed, using visible rows",
        error,
      );
      return rows; // fallback to currently visible data
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (
    fn: (filename: string, headers: string[], rows: string[][]) => void,
  ) => {
    const exportRows = await getRows();
    fn(filename, headers, exportRows);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => handleExport(exportToCSV)}
          className="gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4 text-green-600" />
          Export as CSV
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport(exportToExcel)}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Export as Excel
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport(exportToPDF)}
          className="gap-2 cursor-pointer"
        >
          <FileDown className="h-4 w-4 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
