"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChoiceChips } from "@/components/form/ChoiceChips";
import { FormAlert } from "@/components/form/FormAlert";
import { TextField } from "@/components/form/TextField";
import { saveSection } from "../actions/checklist";
import { sectionSchema, type SectionInput } from "../schemas";

const KINDS = [
  { value: "GRADE", label: "Grade 1–5" },
  { value: "MEASURE", label: "Measure" },
];
const DIRECTION = [
  { value: "up", label: "Higher is better" },
  { value: "down", label: "Lower is better" },
];
const blank = { label: "", kind: "GRADE" as const, unit: "", higherIsBetter: true };

/** Add or edit one checklist section and its skills. */
export function SectionSheet({
  open,
  onOpenChange,
  id,
  values,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  values?: SectionInput;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const form = useForm<SectionInput>({
    resolver: zodResolver(sectionSchema),
    defaultValues: values ?? { name: "", description: "", metrics: [blank] },
    mode: "onTouched",
  });
  const skills = useFieldArray({ control: form.control, name: "metrics" });
  const kinds = useWatch({ control: form.control, name: "metrics" });

  const submit = form.handleSubmit((v) =>
    start(async () => {
      setError(null);
      const res = await saveSection(id ?? null, v);
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      onOpenChange(false);
      if (!id) form.reset({ name: "", description: "", metrics: [blank] });
      router.refresh();
    }),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{id ? `Edit ${values?.name}` : "New section"}</SheetTitle>
          <SheetDescription>Group related skills, e.g. Technique or Speed.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <FormAlert message={error} />
              <TextField<SectionInput> name="name" label="Section" autoComplete="off" placeholder="e.g. Technique" />
              <TextField<SectionInput> name="description" label="Description" optional autoComplete="off" />

              <div className="space-y-3">
                <p className="text-sm font-medium">Skills</p>
                {skills.fields.map((f, i) => {
                  const measure = kinds?.[i]?.kind === "MEASURE";
                  return (
                    <div key={f.id} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-start gap-2">
                        <FormField
                          control={form.control}
                          name={`metrics.${i}.label`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="sr-only">Skill {i + 1}</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-11" placeholder="e.g. First touch" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Move up" disabled={i === 0} onClick={() => skills.move(i, i - 1)}>
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11"
                          aria-label="Move down"
                          disabled={i === skills.fields.length - 1}
                          onClick={() => skills.move(i, i + 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove skill ${i + 1}`} disabled={skills.fields.length === 1} onClick={() => skills.remove(i)}>
                          <X />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`metrics.${i}.kind`}
                        render={({ field }) => (
                          <ChoiceChips label="Scored as" options={KINDS} value={field.value} onChange={(v) => field.onChange(v)} />
                        )}
                      />
                      {measure && (
                        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                          <FormField
                            control={form.control}
                            name={`metrics.${i}.unit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <FormControl>
                                  <Input {...field} className="h-11" placeholder="s, m, touches" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`metrics.${i}.higherIsBetter`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Better is</FormLabel>
                                <ChoiceChips label="Better is" options={DIRECTION} value={field.value ? "up" : "down"} onChange={(v) => field.onChange(v === "up")} />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <FormField control={form.control} name="metrics" render={() => <FormMessage />} />
                <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => skills.append(blank)} disabled={skills.fields.length >= 30}>
                  <Plus /> Add a skill
                </Button>
              </div>
            </div>
            <SheetFooter className="flex-row justify-end border-t">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="min-w-32">
                {saving && <Loader2 className="animate-spin" />} {id ? "Save section" : "Add section"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
