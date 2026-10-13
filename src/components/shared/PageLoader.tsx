import { cn } from "@/lib/utils";
import { PitchLoader } from "./PitchLoader";

/**
 * In-page loading state for client-fetched sections. Fills the space the
 * content will take so the layout doesn't jump when it arrives.
 */
export const PageLoader = ({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) => (
  <div
    className={cn(
      "animate-loader-rise flex min-h-64 flex-col items-center justify-center gap-4",
      className,
    )}
  >
    <PitchLoader size="lg" label={label} />
    <p className="font-display text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">
      {label}
    </p>
  </div>
);
