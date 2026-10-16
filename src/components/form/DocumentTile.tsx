"use client";

import { useRef, useState } from "react";
import { FilePlus2, FileText, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpload } from "./use-upload";

/**
 * One document as a card-shaped slot: tap (or drop a file) to add it, then
 * it shows the image itself, or a PDF badge, with Replace and Remove.
 */
export function DocumentTile({
  label,
  value,
  onChange,
  folder,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  invalid,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
  invalid?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const { upload, busy, error } = useUpload(folder, onChange);
  const pick = () => input.current?.click();
  const isPdf = value.toLowerCase().endsWith(".pdf");

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
  };

  return (
    <div className="space-y-1.5">
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      {value ? (
        <div className="group relative aspect-[3/2] overflow-hidden rounded-lg border bg-muted" {...dropProps}>
          {isPdf ? (
            <a href={value} target="_blank" rel="noreferrer" className="grid size-full place-items-center pb-9 text-muted-foreground hover:text-foreground">
              <span className="grid place-items-center gap-1">
                <FileText className="size-9" aria-hidden />
                <span className="text-xs font-semibold tracking-wide">PDF</span>
              </span>
            </a>
          ) : (
            <a href={value} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- private /uploads file, served as is */}
              <img src={value} alt={label} className="size-full object-cover" />
            </a>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pt-6 pb-2 text-white">
            <span className="truncate text-sm font-medium">{label}</span>
            <span className="flex shrink-0 gap-1">
              <button type="button" onClick={pick} disabled={busy} className="rounded-md p-1.5 hover:bg-white/20" aria-label={`Replace ${label}`}>
                <RefreshCw className="size-4" />
              </button>
              <button type="button" onClick={() => onChange("")} disabled={busy} className="rounded-md p-1.5 hover:bg-white/20" aria-label={`Remove ${label}`}>
                <X className="size-4" />
              </button>
            </span>
          </div>
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          {...dropProps}
          className={cn(
            "grid aspect-[3/2] w-full place-items-center rounded-lg border-2 border-dashed bg-muted/30 text-center transition-colors hover:border-primary/60 hover:bg-muted/60 disabled:opacity-60",
            over && "border-primary bg-primary/5",
            invalid && "border-destructive/70",
          )}
        >
          <span className="grid justify-items-center gap-1.5 px-3">
            {busy ? <Loader2 className="size-7 animate-spin text-muted-foreground" /> : <FilePlus2 className="size-7 text-muted-foreground" aria-hidden />}
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{busy ? "Uploading…" : "Tap to add"}</span>
          </span>
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
