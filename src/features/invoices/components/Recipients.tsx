"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { cn } from "@/lib/utils";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";

type Person = { athleteId: string; name: string; batchId?: string | null; fromBatch?: string };

/**
 * Who gets an invoice. Tapping a batch lists its athletes, all ticked; untick
 * anyone to leave them out, or add athletes one by one. Reports the ticked IDs.
 */
export function Recipients({
  batches,
  onChange,
  invalid,
}: {
  batches: { id: string; name: string }[];
  onChange: (athleteIds: string[]) => void;
  invalid?: boolean;
}) {
  const queryClient = useQueryClient();
  const [people, setPeople] = useState<Person[]>([]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const batchName = new Map(batches.map((b) => [b.id, b.name]));

  const update = (nextPeople: Person[], nextOff: Set<string>) => {
    setPeople(nextPeople);
    setOff(nextOff);
    onChange(nextPeople.filter((p) => !nextOff.has(p.athleteId)).map((p) => p.athleteId));
  };

  const toggleBatch = async (next: string[]) => {
    const removed = chosen.find((b) => !next.includes(b));
    if (removed) {
      setChosen(next);
      const keep = people.filter((p) => p.fromBatch !== removed);
      return update(keep, new Set([...off].filter((id) => keep.some((p) => p.athleteId === id))));
    }
    const added = next.find((b) => !chosen.includes(b));
    if (!added) return;
    setLoading(added);
    try {
      const { athletes } = await queryClient.fetchQuery({
        queryKey: ["invoice-recipients", added],
        queryFn: async (): Promise<{ athletes: Person[] }> => {
          const res = await fetch(`/api/invoices/recipients?batches=${added}`);
          if (!res.ok) throw new Error();
          return res.json();
        },
      });
      if (!athletes.length) return void toast.info(`No athletes to bill in ${batchName.get(added)}.`);
      setChosen(next);
      const have = new Set(people.map((p) => p.athleteId));
      update([...people, ...athletes.filter((a) => !have.has(a.athleteId)).map((a) => ({ ...a, fromBatch: added }))], off);
    } catch {
      toast.error("Couldn't load that batch. Try again.");
    } finally {
      setLoading(null);
    }
  };

  const ticked = people.length - off.size;
  const allOn = off.size === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Batches</p>
        <ChoiceChips
          label="Batches"
          multiple
          options={batches.map((b) => ({ value: b.id, label: loading === b.id ? `${b.name}…` : b.name }))}
          value={chosen}
          onChange={(v) => void toggleBatch(v as string[])}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Add an athlete</p>
        <AthletePicker
          value={null}
          invalid={invalid && !people.length}
          onChange={(a) => {
            if (!a) return;
            if (people.some((p) => p.athleteId === a.athleteId)) {
              const nextOff = new Set(off);
              nextOff.delete(a.athleteId);
              return update(people, nextOff);
            }
            update([...people, { athleteId: a.athleteId, name: a.name }], off);
          }}
        />
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading {batchName.get(loading)}
        </p>
      )}

      {people.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <Checkbox
                checked={allOn ? true : ticked === 0 ? false : "indeterminate"}
                onCheckedChange={() => update(people, allOn ? new Set(people.map((p) => p.athleteId)) : new Set())}
                aria-label="Tick everyone"
              />
              <span className="tabular">
                {ticked} of {people.length} selected
              </span>
            </label>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setChosen([]);
                update([], new Set());
              }}
            >
              Clear
            </button>
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {people.map((p) => {
              const on = !off.has(p.athleteId);
              return (
                <li key={p.athleteId}>
                  <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5", !on && "text-muted-foreground")}>
                    <Checkbox
                      checked={on}
                      onCheckedChange={() => {
                        const nextOff = new Set(off);
                        if (on) nextOff.add(p.athleteId);
                        else nextOff.delete(p.athleteId);
                        update(people, nextOff);
                      }}
                    />
                    <span className="grid min-w-0 flex-1 leading-tight">
                      <span className={cn("truncate font-medium", !on && "line-through")}>{p.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{p.athleteId}</span>
                        {p.batchId && batchName.get(p.batchId) && ` · ${batchName.get(p.batchId)}`}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
