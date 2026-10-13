import { cn } from "@/lib/utils";

/**
 * Busy indicator for buttons and inline actions. Takes the colour of the
 * text around it, so it reads on primary, outline and destructive buttons.
 */
export const Loader2Spinner = ({ className }: { className?: string }) => (
  <span role="status" className={cn("inline-flex items-center", className)}>
    <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <span className="sr-only">Working…</span>
  </span>
);
