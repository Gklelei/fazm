"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  ZoomIn,
  ShieldCheck,
  Baby,
  BookOpen,
} from "lucide-react";
import { GetAthleteByIdQueryType } from "../Types";

type DocEntry = {
  label: string;
  url: string;
  icon: React.ReactNode;
};

function buildDocs(data: GetAthleteByIdQueryType): DocEntry[] {
  const docs: DocEntry[] = [];

  // --- Identification: passport OR national ID + birth certificate ---
  const hasPassport = !!(data.passportCover || data.passportBioData);

  if (hasPassport) {
    // Only show passport pages
    if (data.passportCover) {
      docs.push({
        label: "Passport – Cover Page",
        url: data.passportCover,
        icon: <BookOpen className="h-5 w-5" />,
      });
    }
    if (data.passportBioData) {
      docs.push({
        label: "Passport – Bio Data Page",
        url: data.passportBioData,
        icon: <BookOpen className="h-5 w-5" />,
      });
    }
  } else {
    // Show national ID and birth certificate
    if (data.nationalIdFront) {
      docs.push({
        label: "National ID – Front",
        url: data.nationalIdFront,
        icon: <ShieldCheck className="h-5 w-5" />,
      });
    }
    if (data.nationalIdBack) {
      docs.push({
        label: "National ID – Back",
        url: data.nationalIdBack,
        icon: <ShieldCheck className="h-5 w-5" />,
      });
    }
    if (data.birthCertificate) {
      docs.push({
        label: "Birth Certificate",
        url: data.birthCertificate,
        icon: <Baby className="h-5 w-5" />,
      });
    }
  }

  return docs;
}

function isImage(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}

function DocCard({ doc }: { doc: DocEntry }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const showImage = isImage(doc.url);

  return (
    <>
      <div className="rounded-xl border overflow-hidden">
        {/* Thumbnail / preview area */}
        {showImage ? (
          <div
            className="relative w-full h-40 bg-muted/40 cursor-zoom-in flex items-center justify-center group overflow-hidden"
            onClick={() => setPreviewOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.url}
              alt={doc.label}
              className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 h-6 w-6 transition-opacity" />
            </div>
          </div>
        ) : (
          /* PDF / non-image: show icon placeholder */
          <div
            className="w-full h-40 bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => window.open(doc.url, "_blank")}
          >
            <FileText className="h-10 w-10 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">
              Click to open PDF
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-primary shrink-0">{doc.icon}</div>
            <span className="text-sm font-medium truncate">{doc.label}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showImage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1 text-xs"
                onClick={() => setPreviewOpen(true)}
              >
                <ZoomIn className="h-3.5 w-3.5" />
                Preview
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 gap-1 text-xs"
              onClick={() =>
                downloadFile(
                  doc.url,
                  `${doc.label.replace(/\s+/g, "_").toLowerCase()}.${doc.url.split(".").pop()?.split("?")[0] ?? "file"}`,
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Full-screen preview dialog */}
      {showImage && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl w-full p-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {doc.icon} {doc.label}
              </DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.url}
              alt={doc.label}
              className="w-full max-h-[75vh] object-contain rounded-lg border"
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  downloadFile(
                    doc.url,
                    `${doc.label.replace(/\s+/g, "_").toLowerCase()}.${doc.url.split(".").pop()?.split("?")[0] ?? "file"}`,
                  )
                }
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function AthleteDocuments({
  data,
}: {
  data: GetAthleteByIdQueryType;
}) {
  const docs = buildDocs(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Official Documents
        </CardTitle>
        {docs.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No documents have been uploaded for this athlete.
          </p>
        )}
        {docs.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {docs.length} document{docs.length !== 1 ? "s" : ""} available
            </Badge>
          </div>
        )}
      </CardHeader>
      {docs.length > 0 && (
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <DocCard key={doc.label} doc={doc} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
