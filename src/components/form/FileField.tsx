"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One document or photo: upload it (image or PDF, 10 MB, checked by the
 * server), see it, remove it. Stores the file's /uploads/... address.
 */
export function FileField({
  value,
  onChange,
  folder,
  label,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  imagePreview,
  invalid,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label: string;
  accept?: string;
  imagePreview?: boolean;
  invalid?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) return setError("That file is over 10 MB.");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("dir", folder);
      const res = await fetch("/api/files/upload", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed. Try again.");
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const isPdf = value.toLowerCase().endsWith(".pdf");

  return (
    <div className="min-w-0 space-y-1.5">
      <div
        className={cn(
          "flex min-h-14 items-center gap-3 rounded-md border bg-background p-2 pl-3",
          invalid && "border-destructive",
          !value && "border-dashed",
        )}
      >
        {value && imagePreview && !isPdf ? (
          // eslint-disable-next-line @next/next/no-img-element -- private /uploads file, served as is
          <img src={value} alt="" className="size-10 shrink-0 rounded object-cover" />
        ) : (
          <FileText className={cn("size-5 shrink-0", value ? "text-primary" : "text-muted-foreground")} aria-hidden />
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {value ? (
              <a href={value} target="_blank" rel="noreferrer" className="hover:underline">
                {isPdf ? "PDF uploaded" : "Uploaded"}, open
              </a>
            ) : (
              accept.includes("pdf") ? "JPG, PNG, WebP or PDF, up to 10 MB" : "JPG, PNG or WebP, up to 10 MB"
            )}
          </p>
        </div>
        <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy} aria-label={`Remove ${label}`}>
            <X /> Remove
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
