import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A scoreboard figure: label above, the number set big in the condensed
 * display face, an optional note underneath. Links when given `href`.
 */
export function StatCard({
  label,
  value,
  note,
  tone = "default",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-display tabular mt-1 text-[clamp(1.5rem,6vw,2.25rem)] leading-none font-bold break-words",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning-foreground dark:text-warning",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </>
  );

  const classes = cn(
    "block rounded-lg border bg-card p-4 text-card-foreground",
    href &&
      "transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
