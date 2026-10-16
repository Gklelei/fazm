"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type RailStep = { key: string; label: string };

/**
 * Where you are in a long form. Wide screens: a vertical list, finished steps
 * ticked and clickable. Phones: "Step 2 of 7 · Guardian" over a progress bar.
 */
export function StepRail({
  steps,
  current,
  done,
  onSelect,
}: {
  steps: RailStep[];
  current: number;
  done: Set<string>;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <div className="lg:hidden" aria-live="polite">
        <p className="text-sm">
          <span className="text-muted-foreground">
            Step {current + 1} of {steps.length} ·{" "}
          </span>
          <span className="font-medium">{steps[current].label}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <nav className="hidden lg:block" aria-label="Steps">
        <ol className="space-y-1">
          {steps.map((s, i) => {
            const isDone = done.has(s.key) && i !== current;
            const reachable = isDone || i <= current;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => onSelect(i)}
                  aria-current={i === current ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    i === current ? "bg-muted font-medium" : reachable ? "hover:bg-muted/60" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      isDone && "border-success bg-success text-success-foreground",
                      i === current && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {isDone ? <Check className="size-3.5" aria-label="done" /> : i + 1}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
