import { cn } from "@/lib/utils";

const SIZE = { sm: "size-5", md: "size-10", lg: "size-16", xl: "size-28" } as const;

/**
 * The Fazam loading mark: the centre circle draws itself in crest gold
 * around a breathing centre spot (ink colour, so it reads on light and dark).
 * A faint full circle underneath keeps the shape legible mid-stroke.
 */
export function PitchLoader({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: keyof typeof SIZE;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="status"
      aria-label={label}
      className={cn(SIZE[size], "shrink-0 text-foreground", className)}
      fill="none"
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="var(--brand-gold)"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        className="animate-pitch-draw"
      />
      <circle cx="24" cy="24" r="3.5" fill="currentColor" className="animate-pitch-spot" />
    </svg>
  );
}
