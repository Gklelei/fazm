import { cn } from "@/lib/utils";

/**
 * A titled group of fields. With room, the title and help sit in a column
 * to the left of the fields; in narrow spaces they stack.
 */
export function FormSection({
  title,
  description,
  children,
  className,
  columns = 2,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Field columns from sm up */
  columns?: 1 | 2;
}) {
  return (
    // Sized by the space it has (page, dialog, side panel), not the window
    <section className={cn("@container", className)}>
      <div className="grid gap-x-10 gap-y-4 @3xl:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className={cn("grid content-start gap-4", columns === 2 && "@md:grid-cols-2")}>{children}</div>
      </div>
    </section>
  );
}
