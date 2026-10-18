"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Ruler, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/PageHeader";
import { moveSection, setSectionArchived } from "../actions/checklist";
import type { SectionInput } from "../schemas";
import { ExportTemplateButton } from "./ExportTemplateButton";
import { SectionSheet } from "./SectionSheet";

export type ChecklistSection = {
  id: string;
  name: string;
  description: string | null;
  metrics: { id: string; label: string; kind: "GRADE" | "MEASURE"; unit: string | null; higherIsBetter: boolean }[];
};

const toInput = (s: ChecklistSection): SectionInput => ({
  name: s.name,
  description: s.description ?? "",
  metrics: s.metrics.map((m) => ({ id: m.id, label: m.label, kind: m.kind, unit: m.unit ?? "", higherIsBetter: m.higherIsBetter })),
});

/** The one checklist every athlete is assessed on. Admins edit it; coaches see it. */
export function Checklist({ sections, canEdit }: { sections: ChecklistSection[]; canEdit: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ChecklistSection | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ success: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.message);
      if (res.message) toast.success(res.message);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="The skills athletes are assessed on after a session."
        actions={
          <>
            {sections.length > 0 && <ExportTemplateButton sections={sections} />}
            {canEdit && (
              <Button onClick={() => setAdding(true)}>
                <Plus /> New section
              </Button>
            )}
          </>
        }
      />

      {sections.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-lg border bg-card px-4 py-14 text-center">
          <p className="font-medium">No skills to assess yet.</p>
          {canEdit && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> New section
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((s, i) => (
            <section key={s.id} className="overflow-hidden rounded-lg border bg-card">
              <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{s.name}</h2>
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                </div>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" disabled={pending} aria-label={`Actions for ${s.name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => setEditing(s)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      {i > 0 && (
                        <DropdownMenuItem onSelect={() => run(() => moveSection(s.id, -1))}>
                          <ArrowUp /> Move up
                        </DropdownMenuItem>
                      )}
                      {i < sections.length - 1 && (
                        <DropdownMenuItem onSelect={() => run(() => moveSection(s.id, 1))}>
                          <ArrowDown /> Move down
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem variant="destructive" onSelect={() => run(() => setSectionArchived(s.id, true))}>
                        <Archive /> Take out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </header>
              <ol className="divide-y">
                {s.metrics.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      {m.kind === "GRADE" ? (
                        <>
                          <Star className="size-3.5" /> Grade 1–5
                        </>
                      ) : (
                        <>
                          <Ruler className="size-3.5" /> {m.unit}, {m.higherIsBetter ? "higher" : "lower"} is better
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {canEdit && <SectionSheet open={adding} onOpenChange={setAdding} />}
      {editing && <SectionSheet key={editing.id} open onOpenChange={(o) => !o && setEditing(null)} id={editing.id} values={toInput(editing)} />}
    </div>
  );
}
