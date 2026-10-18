import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A titled group of fields, as its own card: a small icon and the title on
 * top, the fields below. Fields sit in two columns when the card has room.
 */
export function FormSection({
  title,
  description,
  icon: Icon,
  aside,
  children,
  className,
  columns = 2,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Shown at the right of the title, e.g. a count or a small action */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Field columns when there's room */
  columns?: 1 | 2;
}) {
  return (
    // Sized by the space it has (page, dialog, side panel), not the window
    <section className={cn("@container rounded-xl border bg-card shadow-xs", className)}>
      <header className="flex items-start gap-3 border-b px-4 py-3 sm:px-5">
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1 self-center">
          <h2 className="text-base leading-tight font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside && <div className="shrink-0 self-center">{aside}</div>}
      </header>
      <div className={cn("grid content-start gap-4 p-4 sm:p-5", columns === 2 && "@md:grid-cols-2")}>{children}</div>
    </section>
  );
}
