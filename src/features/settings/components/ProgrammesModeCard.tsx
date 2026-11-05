"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRAMMES_MODES, type ProgrammesMode } from "@/lib/programme-mode";
import { setProgrammesMode } from "../actions/programmes-mode";

/** Super admin only: who sees programmes. */
export function ProgrammesModeCard({ mode }: { mode: ProgrammesMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = PROGRAMMES_MODES.find((m) => m.value === mode)!;
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">Who sees programmes</h2>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <div role="radiogroup" aria-label="Who sees programmes" className="mt-3 grid gap-2 sm:grid-cols-3">
        {PROGRAMMES_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setProgrammesMode(m.value);
                if (!res.success) return void toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              })
            }
            className={cn(
              "h-10 rounded-md border text-sm font-medium transition-colors",
              mode === m.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{current.hint}</p>
    </section>
  );
}
