"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { FormAlert } from "@/components/form/FormAlert";
import { StickyActions } from "@/components/form/StickyActions";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { cn } from "@/lib/utils";
import { saveAssessment } from "../actions/create-assessment";
import { GRADES } from "../lib/grades";
import type { AssessmentInput } from "../schemas";
import type { ChecklistSection } from "./Checklist";

type Draft = Pick<AssessmentInput, "grades" | "values" | "notes" | "comment">;
const EMPTY: Draft = { grades: {}, values: {}, notes: {}, comment: "" };

/** Assess each athlete on a session's register against the checklist. Phone first. */
export function AssessSession({
  training,
  athletes,
  sections,
  saved: initialSaved,
}: {
  training: { id: string; name: string; when: string; coach: string };
  athletes: { athleteId: string; name: string; photo?: string }[];
  sections: ChecklistSection[];
  /** athleteId → what's already saved */
  saved: Record<string, Draft>;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(initialSaved);
  const [current, setCurrent] = useState(athletes.find((a) => !initialSaved[a.athleteId])?.athleteId ?? athletes[0]?.athleteId);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

  const draft = drafts[current] ?? EMPTY;
  const dirty = useMemo(() => Object.keys(drafts).some((id) => JSON.stringify(drafts[id]) !== JSON.stringify(saved[id] ?? EMPTY)), [drafts, saved]);
  useLeaveWarning(dirty);
  const set = (patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [current]: { ...(d[current] ?? EMPTY), ...patch } }));
  const assessedCount = athletes.filter((a) => saved[a.athleteId]).length;
  const index = athletes.findIndex((a) => a.athleteId === current);
  const person = athletes[index];

  const save = (next: boolean) =>
    start(async () => {
      setError(null);
      const res = await saveAssessment({ trainingId: training.id, athleteId: current, ...draft });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      setSaved((s) => ({ ...s, [current]: draft }));
      router.refresh();
      if (next) {
        const after = athletes.slice(index + 1).find((a) => !saved[a.athleteId]) ?? athletes[index + 1];
        if (after) {
          setCurrent(after.athleteId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });

  if (!athletes.length || !sections.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assess" description={training.name} />
        <p className="rounded-lg border bg-card px-4 py-14 text-center text-sm text-muted-foreground">
          {!athletes.length ? "No athletes are on this session's register." : "There are no skills to assess yet. Ask an admin to set up the checklist."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href={`/sessions/view/${training.id}`}>
          <ArrowLeft /> Session
        </Link>
      </Button>
      <PageHeader title="Assess" description={`${training.name} · ${training.when} · ${training.coach}`} />

      <div className="space-y-2">
        <p className="tabular text-sm text-muted-foreground">
          {assessedCount} of {athletes.length} assessed
        </p>
        {/* Athletes: a strip that scrolls on phones, wraps on wider screens */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {athletes.map((a) => {
            const done = !!saved[a.athleteId];
            const on = a.athleteId === current;
            return (
              <button
                key={a.athleteId}
                type="button"
                onClick={() => setCurrent(a.athleteId)}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm whitespace-nowrap",
                  on ? "border-primary bg-primary text-primary-foreground" : done ? "border-success/40 bg-success/10" : "bg-card hover:bg-muted",
                )}
                aria-pressed={on}
              >
                {done && <Check className="size-4" aria-label="Assessed" />}
                {a.name.split(" ")[0]} {a.name.split(" ").at(-1)?.[0]}.
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        <ProfileAvatar name={person.name} url={person.photo} size={44} />
        <div className="grid leading-tight">
          <span className="font-medium">{person.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{person.athleteId}</span>
        </div>
      </div>

      <FormAlert message={error} />

      {sections.map((s) => (
        <section key={s.id} className="overflow-hidden rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 font-display text-lg font-semibold tracking-wide uppercase">{s.name}</h2>
          <ul className="divide-y">
            {s.metrics.map((m) => (
              <li key={m.id} className="space-y-2 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{m.label}</span>
                  {m.kind === "GRADE" && draft.grades[m.id] && (
                    <span className="text-sm text-muted-foreground">{GRADES.find((g) => g.value === draft.grades[m.id])?.label}</span>
                  )}
                </div>
                {m.kind === "GRADE" ? (
                  <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={m.label}>
                    {GRADES.map((g) => {
                      const on = draft.grades[m.id] === g.value;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={g.label}
                          title={g.label}
                          onClick={() => {
                            const grades = { ...draft.grades };
                            if (on) delete grades[m.id];
                            else grades[m.id] = g.value;
                            set({ grades });
                          }}
                          className={cn(
                            "h-11 rounded-md border text-base font-semibold tabular-nums transition-colors",
                            on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                          )}
                        >
                          {g.short}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      inputMode="decimal"
                      aria-label={`${m.label} (${m.unit})`}
                      className="h-11 w-32 text-base"
                      value={draft.values[m.id] ?? ""}
                      onChange={(e) => set({ values: { ...draft.values, [m.id]: e.target.value.replace(",", ".") } })}
                    />
                    <span className="text-sm text-muted-foreground">{m.unit}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t px-4 py-3">
            {openNotes[`${current}:${s.id}`] || draft.notes[s.id] ? (
              <Textarea
                aria-label={`${s.name} note`}
                rows={2}
                placeholder={`${s.name} note`}
                value={draft.notes[s.id] ?? ""}
                onChange={(e) => set({ notes: { ...draft.notes, [s.id]: e.target.value } })}
              />
            ) : (
              <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setOpenNotes((o) => ({ ...o, [`${current}:${s.id}`]: true }))}>
                Add a note
              </Button>
            )}
          </div>
        </section>
      ))}

      <section className="space-y-2 rounded-lg border bg-card p-4">
        <label htmlFor="assess-comment" className="text-sm font-medium">
          Comment <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea id="assess-comment" rows={3} value={draft.comment ?? ""} onChange={(e) => set({ comment: e.target.value })} />
      </section>

      <StickyActions>
        <Button variant="ghost" onClick={() => save(false)} disabled={saving}>
          Save
        </Button>
        <Button onClick={() => save(true)} disabled={saving} className="min-w-36">
          {saving && <Loader2 className="animate-spin" />} {index < athletes.length - 1 ? "Save & next" : "Save"}
        </Button>
      </StickyActions>
    </div>
  );
}
