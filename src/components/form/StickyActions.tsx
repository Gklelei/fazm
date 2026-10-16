import { cn } from "@/lib/utils";

/** The form's buttons, pinned to the bottom of the screen while scrolling. */
export function StickyActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      // Pressing a button here mustn't blur the field being edited: the blur
      // clears its error message, the bar moves up, and the click would miss
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
      className={cn(
        "sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
