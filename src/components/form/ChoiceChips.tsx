"use client";

import { cn } from "@/lib/utils";

/**
 * A small set of choices as tap-friendly chips (relationship, stronger foot,
 * positions...). Single choice by default; `multiple` for lists.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  multiple,
  label,
  invalid,
}: {
  options: readonly { value: T; label: string }[];
  value: T | T[] | undefined;
  onChange: (value: T | T[]) => void;
  multiple?: boolean;
  label: string;
  invalid?: boolean;
}) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            // Keep focus where it is: blurring a field with an error removes its
            // message, the chips move up, and the click would miss
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!multiple) return onChange(o.value);
              const next = new Set(selected);
              if (on) next.delete(o.value);
              else next.add(o.value);
              onChange(options.map((x) => x.value).filter((v) => next.has(v)));
            }}
            className={cn(
              "h-10 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              invalid && !on && "border-destructive/60",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
