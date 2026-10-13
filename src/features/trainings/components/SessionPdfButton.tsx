"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GetAllTrainingSessionsByIdQueryType } from "@/features/assessments/queries";
import { downloadTrainingSessionPdf } from "../lib/session-pdf";

export function SessionPdfButton({ data }: { data: GetAllTrainingSessionsByIdQueryType }) {
  return (
    <Button variant="outline" onClick={() => downloadTrainingSessionPdf(data)}>
      <Download /> Download PDF
    </Button>
  );
}
