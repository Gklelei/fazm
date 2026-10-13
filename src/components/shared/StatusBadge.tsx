import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning:
    "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

/**
 * Every status in the app maps to one referee colour:
 * green = good to go, yellow card = needs attention, red card = problem.
 */
const STATUS_TONE: Record<string, Tone> = {
  // athletes
  ACTIVE: "success",
  PENDING: "warning",
  DEACTIVATED: "neutral",
  SUSPENDED: "danger",
  DEFAULT: "neutral",
  // attendance
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "danger",
  EXCUSED: "info",
  // invoices
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "danger",
  CANCELED: "neutral",
  // sessions
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const label = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");

export function StatusBadge({
  status,
  tone,
  children,
  className,
}: {
  status?: string | null;
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
}) {
  const key = (status ?? "").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[tone ?? STATUS_TONE[key] ?? "neutral"],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children ?? (key ? label(key) : "—")}
    </span>
  );
}
