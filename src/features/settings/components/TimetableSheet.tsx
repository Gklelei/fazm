"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { minutesBetween } from "@/lib/academy-time";
import { cn } from "@/lib/utils";
import { saveTimetable } from "../actions/squads";
import { DAYS, type Day } from "../lib/plan-sessions";
import { timetableSchema } from "../schemas";

const DAY_SHORT: Record<Day, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export type SlotDraft = {
  days: Day[];
  time: string;
  endTime: string;
  trainingLocationsId: string;
  staffId: string;
};
type Option = { id: string; name: string };

const blank = (prev?: SlotDraft): SlotDraft => ({
  days: [],
  time: prev?.time ?? "16:00",
  endTime: prev?.endTime ?? "17:30",
  trainingLocationsId: prev?.trainingLocationsId ?? "",
  staffId: prev?.staffId ?? "",
});

const duration = (s: SlotDraft) => {
  const m = minutesBetween(s.time, s.endTime);
  if (m <= 0) return null;
  return m % 60
    ? `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h ` : ""}${m % 60} min`
    : `${m / 60} h`;
};

/** Edit a squad's weekly timetable: each slot is days, a time, a pitch and a coach. */
export function TimetableSheet({
  open,
  onOpenChange,
  squad,
  initial,
  pitches,
  coaches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squad: { id: string; name: string };
  initial: SlotDraft[];
  pitches: Option[];
  coaches: Option[];
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [slots, setSlots] = useState<SlotDraft[]>(
    initial.length ? initial : [blank()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<SlotDraft>) =>
    setSlots((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const toggleDay = (i: number, d: Day) =>
    update(i, {
      days: slots[i].days.includes(d)
        ? slots[i].days.filter((x) => x !== d)
        : [...slots[i].days, d],
    });

  const save = () => {
    const parsed = timetableSchema.safeParse({ slots });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        map[issue.path.slice(0, 3).join(".")] ??= issue.message;
      return setErrors(map);
    }
    setErrors({});
    start(async () => {
      const res = await saveTimetable(squad.id, parsed.data);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      onOpenChange(false);
      router.refresh();
    });
  };

  const err = (i: number, field: keyof SlotDraft) =>
    errors[`slots.${i}.${field}`];

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setSlots(initial.length ? initial : [blank()]);
          setErrors({});
        }
        onOpenChange(o);
      }}
    >
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "max-h-[92svh] rounded-t-2xl" : "w-full sm:max-w-xl",
        )}
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-display text-2xl tracking-wide uppercase">
            {squad.name} timetable
          </SheetTitle>
          <SheetDescription>
            When the squad trains each week. Plan sessions uses it to fill the
            calendar; sessions already planned don&apos;t change.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {slots.map((s, i) => (
            <section
              key={i}
              className="space-y-4 rounded-lg border bg-card p-4"
              aria-label={`Slot ${i + 1}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Slot {i + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setSlots((all) => all.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 /> Remove
                </Button>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Days</legend>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS.map((d) => {
                    const on = s.days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDay(i, d)}
                        className={cn(
                          "h-10 rounded-md border text-sm font-medium transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        {DAY_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
                {err(i, "days") && (
                  <p className="mt-1.5 text-sm text-destructive">
                    {err(i, "days")}
                  </p>
                )}
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor={`start-${i}`}>Starts</Label>
                  <Input
                    id={`start-${i}`}
                    type="time"
                    value={s.time}
                    onChange={(e) => update(i, { time: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`end-${i}`}>
                    Ends
                    {duration(s) && (
                      <span className="tabular font-normal text-muted-foreground">
                        · {duration(s)}
                      </span>
                    )}
                  </Label>
                  <Input
                    id={`end-${i}`}
                    type="time"
                    value={s.endTime}
                    onChange={(e) => update(i, { endTime: e.target.value })}
                    aria-invalid={!!err(i, "endTime") || undefined}
                  />
                </div>
              </div>
              {(err(i, "endTime") || err(i, "time")) && (
                <p className="-mt-2 text-sm text-destructive">
                  {err(i, "endTime") ?? err(i, "time")}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Pitch</Label>
                  <Select
                    value={s.trainingLocationsId}
                    onValueChange={(v) => update(i, { trainingLocationsId: v })}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={
                        !!err(i, "trainingLocationsId") || undefined
                      }
                    >
                      <SelectValue placeholder="Choose a pitch" />
                    </SelectTrigger>
                    <SelectContent>
                      {pitches.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err(i, "trainingLocationsId") && (
                    <p className="text-sm text-destructive">
                      {err(i, "trainingLocationsId")}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Coach</Label>
                  <Select
                    value={s.staffId}
                    onValueChange={(v) => update(i, { staffId: v })}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!err(i, "staffId") || undefined}
                    >
                      <SelectValue placeholder="Choose a coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err(i, "staffId") && (
                    <p className="text-sm text-destructive">
                      {err(i, "staffId")}
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))}

          {slots.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No slots. Saving clears the timetable.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setSlots((all) => [...all, blank(all.at(-1))])}
            disabled={slots.length >= 14}
          >
            <Plus /> Add a slot
          </Button>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save timetable
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
