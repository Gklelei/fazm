import { cn } from "@/lib/utils";

/**
 * A titled group of fields. On wide screens the title and help sit in a
 * column to the left of the fields; on phones they stack.
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
    <section className={cn("grid gap-x-10 gap-y-4 lg:grid-cols-[15rem_minmax(0,1fr)]", className)}>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className={cn("grid content-start gap-4", columns === 2 && "sm:grid-cols-2")}>{children}</div>
    </section>
  );
}
