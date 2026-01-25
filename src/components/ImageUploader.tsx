"use client";

import {
  CldUploadWidget,
  CloudinaryUploadWidgetInfo,
  CloudinaryUploadWidgetResults,
} from "next-cloudinary";
import { useState, useEffect } from "react";
import { Loader2, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react";
import Image from "next/image";
import { deleteCloudinaryImage } from "./DeleteImage";

interface CloudinaryUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  folder?: string;
}

const getPublicId = (url: string): string => {
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL: missing '/upload/'");
    }

    let pathAfterUpload = url.substring(uploadIndex + 8);
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, "");
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");

    return publicId;
  } catch (err) {
    console.error("Error parsing public ID:", err);
    throw new Error("Failed to parse image URL");
  }
};

export const CloudinaryUpload = ({
  value,
  onChange,
  disabled = false,
  maxSizeMB = 2,
  folder = "fazam",
}: CloudinaryUploadProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreBodyScroll = () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };

    return () => {
      restoreBodyScroll();
    };
  }, []);

  const restoreBodyScroll = () => {
    setTimeout(() => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    }, 100);
  };

  const onUpload = async (result: CloudinaryUploadWidgetResults) => {
    try {
      setIsUploading(true);
      setError(null);

      const info = result.info as CloudinaryUploadWidgetInfo;

      if (!info?.secure_url) {
        throw new Error("Upload failed: No URL returned");
      }

      if (value) {
        console.log("Deleting old image before upload...");
        const publicId = getPublicId(value);
        const deleteResult = await deleteCloudinaryImage(publicId);

        if (!deleteResult.success) {
          console.warn("Failed to delete old image:", deleteResult.message);
        }
      }

      onChange(info.secure_url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      restoreBodyScroll();
    }
  };

  const onDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const publicId = getPublicId(value);
      console.log("Deleting image with publicId:", publicId);

      const result = await deleteCloudinaryImage(publicId);

      if (!result.success) {
        throw new Error(result.message || "Delete failed");
      }

      onChange("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Delete failed";
      setError(errorMessage);
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const onUploadError = (error: unknown) => {
    console.error("Upload widget error:", error);
    setError("Upload failed. Please try again.");
    setIsUploading(false);
    restoreBodyScroll();
  };

  const maxFileSize = maxSizeMB * 1024 * 1024;
  const isLoading = isDeleting || isUploading;

  return (
    <div className="space-y-3 w-full">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {value ? (
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-muted group">
          <Image
            fill
            src={value}
            alt="Uploaded image"
            className="object-cover"
            sizes="(max-width: 160px) 100vw, 160px"
            priority
          />

          {isDeleting && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading || disabled}
            aria-label="Delete image"
            className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black transition opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <CldUploadWidget
          onSuccess={onUpload}
          onError={onUploadError}
          uploadPreset="fazam-documnets"
          options={{
            maxFiles: 1,
            maxFileSize,
            resourceType: "image",
            folder,
            clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
            multiple: false,
            showAdvancedOptions: false,
            sources: ["local", "google_drive"],
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => {
                setError(null);
                open();
              }}
              disabled={isLoading || disabled}
              aria-label="Upload image"
              className="flex flex-col items-center justify-center w-full h-40 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Uploading...
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Upload image
                  </span>
                  <span className="text-xs text-muted-foreground/70 mt-1">
                    JPG, PNG, WebP — max {maxSizeMB}MB
                  </span>
                </>
              )}
            </button>
          )}
        </CldUploadWidget>
      )}
    </div>
  );
};
