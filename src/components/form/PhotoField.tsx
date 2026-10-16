"use client";

import { useRef } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpload } from "./use-upload";

/** A person's photo: a round frame with Add/Change and Remove. On phones the picker offers the camera. */
export function PhotoField({ value, onChange, folder, invalid }: { value: string; onChange: (url: string) => void; folder: string; invalid?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy, error } = useUpload(folder, onChange);
  return (
    <div className="flex items-center gap-5">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={value ? "Change photo" : "Add photo"}
        className={`relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-muted ${invalid ? "border-destructive" : value ? "border-transparent" : "border-dashed"}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- private /uploads file, served as is
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-12 text-muted-foreground" aria-hidden />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
      </button>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            <Camera /> {value ? "Change photo" : "Add photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange("")} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
