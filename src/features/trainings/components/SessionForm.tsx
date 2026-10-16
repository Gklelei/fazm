"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { FormAlert } from "@/components/form/FormAlert";
import { FormSection } from "@/components/form/FormSection";
import { StickyActions } from "@/components/form/StickyActions";
import { TextField } from "@/components/form/TextField";
import { useLeaveWarning } from "@/components/form/use-leave-warning";
import { academyToday, minutesBetween } from "@/lib/academy-time";
import { useAuthSession } from "@/providers/SessionProvider";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { createSession, updateSession } from "../actions/save-session";
import { sessionSchema, type SessionInput } from "../schemas";
import { SortableDrillList } from "./SortableDrillList";

const length = (start: string, end: string) => {
  const m = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) ? minutesBetween(start, end) : 0;
  if (m <= 0) return null;
  return m % 60 ? `${Math.floor(m / 60) ? `${Math.floor(m / 60)} h ` : ""}${m % 60} min` : `${m / 60} h`;
};

/** Plan or edit one session. One short page: when, who and where, then the plan. */
export function SessionForm({ id, values }: { id?: string; values?: SessionInput }) {
  const router = useRouter();
  const { user } = useAuthSession();
  const utils = UseUtilsContext().data;
  const batches = (utils?.batches ?? []).filter((b) => !/unassigned/i.test(b.name));
  const pitches = utils?.locations ?? [];
  const coaches = utils?.coaches ?? [];
  const isCoach = user.role === "COACH";
  const me = coaches.find((c) => c.userId === user.id);

  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const form = useForm<SessionInput>({
    resolver: zodResolver(sessionSchema),
    defaultValues: values ?? {
      date: academyToday(),
      start: "16:00",
      end: "17:30",
      batch: "",
      location: pitches.length === 1 ? pitches[0].id : "",
      coach: isCoach ? (me?.staffId ?? "") : "",
      title: "",
      description: "",
      drills: [],
      note: "",
    },
    mode: "onTouched",
  });
  useLeaveWarning(form.formState.isDirty && !saved);

  const [startTime, endTime, batchId] = useWatch({ control: form.control, name: ["start", "end", "batch"] });

  // A new session's title follows the batch until someone types their own
  useEffect(() => {
    if (id || form.getFieldState("title").isDirty) return;
    const name = batches.find((b) => b.id === batchId)?.name;
    if (name) {
      form.setValue("title", `${name} training`);
      form.clearErrors("title");
    }
  }, [batchId, batches, form, id]);

  // A new session's coach starts as the batch's coach, until someone picks one
  useEffect(() => {
    if (id || isCoach || form.getFieldState("coach").isDirty) return;
    const theirs = batches.find((b) => b.id === batchId)?.coaches?.find((c) => coaches.some((x) => x.staffId === c.staffId));
    if (theirs) {
      form.setValue("coach", theirs.staffId);
      form.clearErrors("coach");
    }
  }, [batchId, batches, coaches, form, id, isCoach]);

  const submit = form.handleSubmit((v) =>
    start(async () => {
      setError(null);
      const res = id ? await updateSession(id, v) : await createSession(v);
      if (!res.success) return setError(res.message);
      setSaved(true);
      toast.success(res.message);
      router.push(`/sessions/view/${"id" in res ? res.id : id}`);
      router.refresh();
    }),
  );

  const chips = (name: "batch" | "location", label: string, options: { id: string; name: string }[]) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="@md:col-span-2">
          <FormLabel>{label}</FormLabel>
          <ChoiceChips
            label={label}
            options={options.map((o) => ({ value: o.id, label: o.name }))}
            value={field.value}
            onChange={(v) => {
              field.onChange(v);
              form.clearErrors(name);
            }}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6" noValidate>
        <FormAlert message={error} />
        <div className="space-y-8 rounded-lg border bg-card p-4 sm:p-6">
          <FormSection title="When">
            <TextField<SessionInput> name="date" label="Date" type="date" min={id ? undefined : academyToday()} className="@md:col-span-2" />
            <TextField<SessionInput> name="start" label="Starts" type="time" />
            <TextField<SessionInput> name="end" label={`Ends${length(startTime, endTime) ? ` · ${length(startTime, endTime)}` : ""}`} type="time" />
          </FormSection>

          <FormSection title="Who and where">
            {chips("batch", "Batch", batches)}
            {chips("location", "Pitch", pitches)}
            {isCoach ? (
              <div className="space-y-1 @md:col-span-2">
                <p className="text-sm font-medium">Coach</p>
                <p className="text-sm text-muted-foreground">{me?.fullNames ?? user.name}</p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="coach"
                render={({ field }) => (
                  <FormItem className="@md:col-span-2">
                    <FormLabel>Coach</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full data-[size=default]:h-11">
                          <SelectValue placeholder="Choose a coach" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {coaches.map((c) => (
                          <SelectItem key={c.staffId} value={c.staffId}>
                            {c.fullNames}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormSection>

          <FormSection title="Plan" columns={1}>
            <TextField<SessionInput> name="title" label="Title" autoComplete="off" />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Focus <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="e.g. Passing under pressure" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="drills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Drills <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <SortableDrillList availableDrills={utils?.drills ?? []} selectedDrillIds={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        </div>

        <StickyActions>
          <Button variant="ghost" asChild>
            <Link href={id ? `/sessions/view/${id}` : "/sessions"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || (!!id && !form.formState.isDirty)} className="min-w-36">
            {saving && <Loader2 className="animate-spin" />}
            {id ? "Save changes" : "Plan session"}
          </Button>
        </StickyActions>
      </form>
    </Form>
  );
}
