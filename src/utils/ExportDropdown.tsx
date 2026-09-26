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

interface ExportDropdownProps<T> {
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
  mapRow?: (item: T, index: number) => string[];
  /**
   * Optional function to filter the raw API items before mapping.
   * Useful when the client has a search query active but the API returns all items.
   */
  filterFn?: (item: T) => boolean;
}

export default function ExportDropdown<T = unknown>({
  filename,
  headers,
  rows,
  fetchAllUrl,
  mapRow,
  filterFn,
}: ExportDropdownProps<T>) {
  const [loading, setLoading] = useState(false);

  /** Get the rows to export — either from the API or from the prop. */
  const getRows = async (): Promise<string[][]> => {
    if (!fetchAllUrl || !mapRow) return rows;

    setLoading(true);
    try {
      const res = await fetch(fetchAllUrl);
      if (!res.ok) throw new Error("Export fetch failed");
      let data: T[] = await res.json();

      if (filterFn) {
        data = data.filter(filterFn);
      }

      return data.map(mapRow);
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
