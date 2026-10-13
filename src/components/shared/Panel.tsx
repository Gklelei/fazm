import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A titled card section, with an optional "see all" link or summary on the right. */
export function Panel({
  title,
  href,
  linkLabel,
  aside,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-lg border bg-card break-inside-avoid", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
        {aside}
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
          >
            {linkLabel} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

/** Ranked rows with a share-of-total bar: batches, payment methods, categories. */
export function ShareList({
  rows,
  format,
  empty,
  unit = "",
}: {
  rows: { name: string; amount: number; count: number }[];
  format: (n: number) => string;
  empty: React.ReactNode;
  /** What `count` counts, e.g. "payment" → "18 payments · 14%" */
  unit?: string;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (!rows.length || !total) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const share = r.amount / total;
        return (
          <li key={r.name} className="px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 font-medium break-words">{r.name}</span>
              <span className="tabular shrink-0 font-mono font-semibold">{format(r.amount)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(share * 100, 1)}%` }} />
              </span>
              <span className="tabular w-32 shrink-0 text-right text-xs text-muted-foreground">
                {r.count}
                {unit && ` ${unit}${r.count === 1 ? "" : "s"}`} · {Math.round(share * 100)}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
