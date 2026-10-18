"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GetAllTrainingSessionsByIdQueryType } from "@/features/assessments/queries";
import { downloadTrainingSessionPdf } from "../lib/session-pdf";

export function SessionPdfButton({ data, className }: { data: GetAllTrainingSessionsByIdQueryType; className?: string }) {
  return (
    <Button variant="secondary" size="sm" className={className} onClick={() => downloadTrainingSessionPdf(data)}>
      <Download /> PDF
    </Button>
  );
}
