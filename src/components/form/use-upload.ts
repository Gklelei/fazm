"use client";

import { useState } from "react";

/** Uploads one file to /api/files/upload (the server checks type and size) and returns its /uploads address. */
export function useUpload(folder: string, onDone: (url: string) => void) {
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
      onDone(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return { upload, busy, error };
}
