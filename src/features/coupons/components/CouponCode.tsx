"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** The code in a pill, with a button to copy it. */
export function CouponCode({ code, className, large }: { code: string; className?: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={cn("group inline-flex items-center gap-1", className)}>
      <span className={cn("rounded border bg-muted px-2 py-1 font-mono font-semibold", large ? "text-xl" : "text-sm")}>{code}</span>
      <button
        type="button"
        aria-label={`Copy ${code}`}
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await navigator.clipboard.writeText(code).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
