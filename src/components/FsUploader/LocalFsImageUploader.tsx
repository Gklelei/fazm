"use client";

import axios from "axios";
import { useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

interface LocalFsUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  folder?: string;
}

export const LocalFsUpload = ({
  value,
  onChange,
  disabled = false,
  maxSizeMB = 2,
  folder = "uploads",
}: LocalFsUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;
  const isBusy = isUploading || isDeleting;

  const pickFile = () => {
    setError(null);
    inputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image uploads are allowed.");
    }
    if (file.size > maxBytes) {
      throw new Error(`File is too large. Max allowed is ${maxSizeMB}MB.`);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dir", folder);

    // Axios will set the correct multipart boundary automatically
    const res = await axios.post("/api/files/upload", formData, {
      withCredentials: true,
    });

    const url = res.data?.url as string | undefined;
    if (!url) {
      throw new Error("Upload succeeded but no URL was returned.");
    }

    return url;
  };

  const deleteFile = async (url: string) => {
    // Your endpoint is DELETE /api/files/upload with JSON body: { url }
    await axios.delete("/api/files/upload", {
      withCredentials: true,
      data: { url },
      headers: { "Content-Type": "application/json" },
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const url = await uploadFile(file);
      onChange(url);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || "Upload failed");
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const onDelete = async () => {
    if (!value) return;

    try {
      setIsDeleting(true);
      setError(null);

      await deleteFile(value);
      onChange("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || "Delete failed");
      } else {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        disabled={disabled || isBusy}
      />

      {value ? (
        <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-muted group">
          <Image
            fill
            src={value}
            alt="Uploaded image"
            className="object-cover"
            sizes="(max-width: 160px) 100vw, 160px"
            priority
          />

          {(isDeleting || isUploading) && (
            <div className="absolute inset-0 grid place-items-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={disabled || isBusy}
            aria-label="Delete image"
            className="
              absolute right-2 top-2 rounded-full border bg-background/80 p-1.5
              opacity-0 transition group-hover:opacity-100
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1
            "
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={disabled || isBusy}
          className="
            flex h-40 w-full flex-col items-center justify-center gap-2
            rounded-lg border border-dashed bg-muted/30
            hover:bg-muted/40 transition
            disabled:opacity-50 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-1
          "
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Upload image</span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WebP — max {maxSizeMB}MB
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
