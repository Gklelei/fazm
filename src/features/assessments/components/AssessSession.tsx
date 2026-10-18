"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, MessageSquare, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import PrintCompletedAssessment from "./PrintCompletedAssessment";

type Draft = Pick<AssessmentInput, "grades" | "values" | "notes" | "comment">;
type Athlete = { athleteId: string; name: string; photo?: string };
const EMPTY: Draft = { grades: {}, values: {}, notes: {}, comment: "" };

/** The register as a searchable list: who's done, who's next. */
function AthleteList({
  athletes,
  saved,
  current,
  onPick,
  className,
}: {
  athletes: Athlete[];
  saved: Record<string, Draft>;
  current: string;
  onPick: (id: string) => void;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"todo" | "done" | "all">("all");
  const done = athletes.filter((a) => saved[a.athleteId]).length;
  const term = q.trim().toLowerCase();
  const rows = athletes.filter(
    (a) =>
      (show === "all" || (show === "done") === !!saved[a.athleteId]) &&
      (!term || a.name.toLowerCase().includes(term) || a.athleteId.toLowerCase().includes(term)),
  );
  const tab = (key: typeof show, label: string, n: number) => (
    <button
      type="button"
      aria-pressed={show === key}
      onClick={() => setShow(key)}
      className={cn("flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors", show === key ? "bg-background shadow-xs" : "text-muted-foreground hover:text-foreground")}
    >
      {label} <span className="tabular">{n}</span>
    </button>
  );
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="space-y-3 border-b p-4">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">Assessed</span>
            <span className="tabular text-muted-foreground">
              {done} of {athletes.length}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-success" style={{ width: `${(done / athletes.length) * 100}%` }} />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search athletes" placeholder="Search name or ID" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tab("all", "All", athletes.length)}
          {tab("todo", "To do", athletes.length - done)}
          {tab("done", "Done", done)}
        </div>
      </div>
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
        {rows.map((a) => {
          const on = a.athleteId === current;
          const isDone = !!saved[a.athleteId];
          return (
            <li key={a.athleteId}>
              <button
                type="button"
                onClick={() => onPick(a.athleteId)}
                aria-current={on}
                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors", on ? "bg-primary/10" : "hover:bg-muted/50")}
              >
                <ProfileAvatar name={a.name} url={a.photo} size={34} />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className={cn("truncate text-sm", on ? "font-semibold text-primary" : "font-medium")}>{a.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{a.athleteId}</span>
                </span>
                {isDone && (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success text-white" aria-label="Assessed">
                    <Check className="size-3.5" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">No one matches.</li>}
      </ul>
    </div>
  );
}

/** Assess each athlete on a session's register against the checklist. Phone first. */
export function AssessSession({
  training,
  athletes,
  sections,
  saved: initialSaved,
}: {
  training: { id: string; name: string; when: string; coach: string };
  athletes: Athlete[];
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
  const [picking, setPicking] = useState(false);

  const draft = drafts[current] ?? EMPTY;
  const dirty = useMemo(() => Object.keys(drafts).some((id) => JSON.stringify(drafts[id]) !== JSON.stringify(saved[id] ?? EMPTY)), [drafts, saved]);
  useLeaveWarning(dirty);
  const set = (patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [current]: { ...(d[current] ?? EMPTY), ...patch } }));
  const index = athletes.findIndex((a) => a.athleteId === current);
  const person = athletes[index];

  const pick = (id: string) => {
    setCurrent(id);
    setError(null);
    setPicking(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        if (after) pick(after.athleteId);
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

  const list = (className?: string) => <AthleteList athletes={athletes} saved={saved} current={current} onPick={pick} className={className} />;

  return (
    <div className="space-y-4 pb-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href={`/sessions/view/${training.id}`}>
          <ArrowLeft /> {training.name} · {training.when}
        </Link>
      </Button>

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* The register: a side panel on a desktop, a sheet on a phone */}
        <aside className="hidden overflow-hidden rounded-xl border bg-card lg:sticky lg:top-20 lg:flex lg:h-[calc(100svh-6.5rem)]">{list("w-full")}</aside>

        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-xl bg-brand-navy text-white shadow-sm dark:ring-1 dark:ring-white/10">
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <ProfileAvatar name={person.name} url={person.photo} size={56} className="ring-2 ring-brand-gold" />
              <div className="min-w-0 flex-1">
                <p className="tabular text-xs font-medium tracking-wide text-white/60 uppercase">
                  Athlete {index + 1} of {athletes.length}
                  {saved[current] && <span className="ml-2 text-brand-gold">· Assessed</span>}
                </p>
                <h1 className="truncate font-display text-2xl leading-tight font-bold">{person.name}</h1>
                <p className="font-mono text-xs text-white/60">{person.athleteId}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button variant="secondary" size="icon" className="size-10" aria-label="Previous athlete" disabled={index === 0} onClick={() => pick(athletes[index - 1].athleteId)}>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-10"
                  aria-label="Next athlete"
                  disabled={index === athletes.length - 1}
                  onClick={() => pick(athletes[index + 1].athleteId)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-white/5 px-4 py-3 sm:px-5">
              <Sheet open={picking} onOpenChange={setPicking}>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm" className="lg:hidden">
                    <Users /> Change athlete
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="flex h-[85svh] flex-col gap-0 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <SheetHeader className="border-b">
                    <SheetTitle>Choose an athlete</SheetTitle>
                  </SheetHeader>
                  {list("min-h-0 flex-1")}
                </SheetContent>
              </Sheet>
              {saved[current] && (
                <PrintCompletedAssessment
                  athleteName={person.name}
                  athleteId={person.athleteId}
                  trainingName={training.name}
                  trainingDate={training.when}
                  coachName={training.coach}
                  comment={
                    [
                      ...sections.flatMap((sec) => (saved[current].notes[sec.id] ? [`${sec.name}: ${saved[current].notes[sec.id]}`] : [])),
                      saved[current].comment,
                    ]
                      .filter(Boolean)
                      .join("\n") || null
                  }
                  sections={sections}
                  scores={Object.fromEntries(
                    sections.flatMap((sec) =>
                      sec.metrics.flatMap((m) => {
                        const d = saved[current];
                        if (m.kind === "GRADE") return d.grades[m.id] ? [[m.id, d.grades[m.id]]] : [];
                        return d.values[m.id] ? [[m.id, `${d.values[m.id]} ${m.unit ?? ""}`.trim()]] : [];
                      }),
                    ),
                  )}
                />
              )}
              <span className="ml-auto text-xs text-white/60">{training.coach}</span>
            </div>
          </section>

          <FormAlert message={error} />

          {sections.map((s) => (
            <section key={s.id} className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <h2 className="flex items-center gap-3 border-b px-4 py-3 text-base font-semibold sm:px-5">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <ClipboardList className="size-4" />
                </span>
                {s.name}
              </h2>
              <ul className="divide-y">
                {s.metrics.map((m) => {
                  const chosen = GRADES.find((g) => g.value === draft.grades[m.id]);
                  return (
                    <li key={m.id} className="space-y-2.5 px-4 py-3.5 sm:px-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{m.label}</span>
                        {m.kind === "GRADE" ? (
                          <span className={cn("text-sm", chosen ? "font-medium text-primary" : "text-muted-foreground")}>{chosen?.label ?? "Not graded"}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{m.higherIsBetter ? "Higher is better" : "Lower is better"}</span>
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
                                onClick={() => {
                                  const grades = { ...draft.grades };
                                  if (on) delete grades[m.id];
                                  else grades[m.id] = g.value;
                                  set({ grades });
                                }}
                                className={cn(
                                  "grid h-12 place-items-center content-center rounded-lg border transition-colors sm:h-14",
                                  on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-background hover:border-primary/40 hover:bg-muted",
                                )}
                              >
                                <span className="tabular text-lg leading-none font-bold">{g.short}</span>
                                <span className={cn("mt-1 hidden text-[0.7rem] leading-none sm:block", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{g.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            inputMode="decimal"
                            aria-label={`${m.label} (${m.unit})`}
                            className="h-12 w-36 text-lg font-semibold"
                            value={draft.values[m.id] ?? ""}
                            onChange={(e) => set({ values: { ...draft.values, [m.id]: e.target.value.replace(",", ".") } })}
                          />
                          <span className="text-sm text-muted-foreground">{m.unit}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="border-t bg-muted/20 px-4 py-3 sm:px-5">
                {openNotes[`${current}:${s.id}`] || draft.notes[s.id] ? (
                  <Textarea
                    aria-label={`${s.name} note`}
                    rows={2}
                    placeholder={`${s.name} note`}
                    value={draft.notes[s.id] ?? ""}
                    onChange={(e) => set({ notes: { ...draft.notes, [s.id]: e.target.value } })}
                  />
                ) : (
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setOpenNotes((o) => ({ ...o, [`${current}:${s.id}`]: true }))}>
                    <MessageSquare /> Add a note on {s.name.toLowerCase()}
                  </Button>
                )}
              </div>
            </section>
          ))}

          <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <h2 className="flex items-center gap-3 border-b px-4 py-3 text-base font-semibold sm:px-5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                <MessageSquare className="size-4" />
              </span>
              <label htmlFor="assess-comment">
                Comment <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
            </h2>
            <div className="p-4 sm:p-5">
              <Textarea id="assess-comment" rows={3} value={draft.comment ?? ""} onChange={(e) => set({ comment: e.target.value })} />
            </div>
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
      </div>
    </div>
  );
}
