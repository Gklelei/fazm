import { cn } from "@/lib/utils";

/** A placeholder block with a soft light sweep across it. */
export function Bone({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
      <div className="animate-loader-sweep absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-foreground/[0.06] to-transparent" />
    </div>
  );
}

/** Thin gold bar under the header while the next page loads. */
function TopProgress() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      <div className="animate-loader-sweep h-full w-1/3 bg-brand-gold" />
    </div>
  );
}

function HeaderBones({ actions = 2 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Bone className="h-9 w-56" />
        <Bone className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Bone key={i} className="h-9 w-32" />
        ))}
      </div>
    </div>
  );
}

function StatBones({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", count === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
          <Bone className="h-3 w-24" />
          <Bone className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}

function ListBones({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
        <Bone className="h-9 flex-1" />
        <Bone className="h-9 w-full md:w-36" />
        <Bone className="h-9 w-full md:w-36" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Bone className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3.5 w-48 max-w-[60%]" />
              <Bone className="h-3 w-28" />
            </div>
            <Bone className="hidden h-3.5 w-20 md:block" />
            <Bone className="hidden h-5 w-16 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Route-level loading state shaped like the page that's coming, so content
 * slots in without the layout jumping.
 */
export function PageSkeleton({
  variant = "list",
}: {
  variant?: "list" | "dashboard" | "detail" | "form";
}) {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <TopProgress />
      {variant === "detail" && <Bone className="h-6 w-24" />}
      <HeaderBones actions={variant === "form" ? 0 : 2} />

      {variant === "dashboard" && (
        <>
          <StatBones />
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3"><ListBones rows={5} /></div>
            <div className="space-y-3 rounded-lg border bg-card p-4 xl:col-span-2">
              {Array.from({ length: 6 }, (_, i) => <Bone key={i} className="h-8 w-full" />)}
            </div>
          </div>
        </>
      )}

      {variant === "list" && <ListBones />}

      {variant === "detail" && (
        <>
          <StatBones />
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, i) => <Bone key={i} className="h-8 w-24" />)}
          </div>
          <div className="grid gap-4 rounded-lg border bg-card p-6 sm:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-4 w-32" />
              </div>
            ))}
          </div>
        </>
      )}

      {variant === "form" && (
        <div className="space-y-5 rounded-lg border bg-card p-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Bone className="h-3.5 w-24" /><Bone className="h-10 w-full" /></div>
              <div className="space-y-2"><Bone className="h-3.5 w-24" /><Bone className="h-10 w-full" /></div>
            </div>
          ))}
          <Bone className="ml-auto h-10 w-36" />
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
