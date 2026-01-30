"use client";

import React, { useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { BatchesSchemaTest } from "../../Validation";
import { BatchSubmission, CreateBatchWithSchedule } from "./server";
import { Sweetalert } from "@/utils/Alerts/Sweetalert";

type FormType = z.input<typeof BatchesSchemaTest>;

const WEEK_DAYS = [
  { value: "MONDAY", label: "Mon" },
  { value: "TUESDAY", label: "Tue" },
  { value: "WEDNESDAY", label: "Wed" },
  { value: "THURSDAY", label: "Thu" },
  { value: "FRIDAY", label: "Fri" },
  { value: "SATURDAY", label: "Sat" },
  { value: "SUNDAY", label: "Sun" },
] as const;

const minutesFromHHmm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const BatchWithSessionsForm = () => {
  const { data } = UseUtilsContext();
  const locations = data?.locations ?? [];
  const coaches = data?.coaches ?? [];
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormType>({
    resolver: zodResolver(BatchesSchemaTest),
    defaultValues: {
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
      trainingLocationsId: "",
      staffId: "",
      sessions: [{ days: [], startTime: "", endTime: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sessions",
  });

  const handleSubmit = async (values: FormType) => {
    startTransition(async () => {
      // Force transform the form inputs (which might be strings) into strict Dates
      const payload: BatchSubmission = {
        ...values,
        startDate: new Date(values.startDate as string),
        endDate: new Date(values.endDate as string),
        description: values.description || undefined,
        note: values.description || undefined, // Mapping form description to note if needed
      };

      const result = await CreateBatchWithSchedule(payload);

      if (result.success) {
        Sweetalert({
          icon: "success",
          text: result.message,
          title: "Success!",
        });
      } else {
        Sweetalert({
          icon: "error",
          text: result.message,
          title: "An error has occurred",
        });
      }
    });
  };

  return (
    <div className="max-w-full mx-auto px-2 sm:px-4 py-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-semibold">
            Create batch schedule
          </CardTitle>
          <CardDescription>
            Define batch dates, coach/location, and weekly training sessions.
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8"
            >
              {/* Batch details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Batch details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Name
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. U17 - Term 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional short note..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                        Notes (optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-24 resize-none"
                          placeholder="Optional longer description..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dates + defaults */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Defaults
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="startDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Start date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? String(field.value) : ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="endDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          End date
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? String(field.value) : ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="trainingLocationsId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Training location
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl className="w-full">
                            <SelectTrigger>
                              <SelectValue placeholder="Select location..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="staffId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                          Coach
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl className="w-full">
                            <SelectTrigger>
                              <SelectValue placeholder="Select coach..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {coaches.map((c) => (
                              <SelectItem key={c.staffId} value={c.staffId}>
                                {c.fullNames} ({c.staffId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sessions */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Weekly sessions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Add one or more session times and the days they occur.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({ days: [], startTime: "", endTime: "" })
                    }
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add session
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((f, idx) => (
                    <div key={f.id} className="rounded-md border p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">Session {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Choose days and start/end time
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          aria-label="Remove session"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>

                      {/* Days */}
                      <FormField
                        name={`sessions.${idx}.days`}
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                              Days
                            </FormLabel>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                              {WEEK_DAYS.map((d) => {
                                const checked = field.value?.includes(d.value);
                                return (
                                  <label
                                    key={d.value}
                                    className="flex items-center gap-2 rounded-md border px-2 py-2 text-sm cursor-pointer select-none"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => {
                                        const isChecked = Boolean(v);
                                        const next = new Set(field.value ?? []);
                                        if (isChecked) next.add(d.value);
                                        else next.delete(d.value);
                                        field.onChange(Array.from(next));
                                      }}
                                    />
                                    <span>{d.label}</span>
                                  </label>
                                );
                              })}
                            </div>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Times */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          name={`sessions.${idx}.startTime`}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                                Start time
                              </FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          name={`sessions.${idx}.endTime`}
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wide">
                                End time
                              </FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* computed duration preview */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Duration
                          </p>
                          <div className="h-10 rounded-md border px-3 flex items-center text-sm text-muted-foreground">
                            {(() => {
                              const s = form.watch(`sessions.${idx}.startTime`);
                              const e = form.watch(`sessions.${idx}.endTime`);
                              if (!s || !e) return "—";
                              const mins =
                                minutesFromHHmm(e) - minutesFromHHmm(s);
                              return mins > 0 ? `${mins} min` : "—";
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* top-level sessions error (e.g. no sessions) */}
                <FormField
                  name="sessions"
                  control={form.control}
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Batch Schedule"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchWithSessionsForm;
