"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProgramme } from "@/providers/ProgrammeContext";

// The select can't hold an empty value; the form stores "" for "every programme"
const ANY = "any";

/**
 * Which programme a record belongs to, or none (an expense shared by all,
 * a fee plan any programme can use). Hidden when the academy runs one programme.
 */
export function ProgrammeField<T extends FieldValues>({
  control,
  name,
  anyLabel,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  /** What "no programme" means here, e.g. "Shared by all programmes" */
  anyLabel: string;
}) {
  const { programmes } = useProgramme();
  if (programmes.length < 2) return null;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>Programme</FormLabel>
          <Select value={field.value || ANY} onValueChange={(v) => field.onChange(v === ANY ? "" : v)}>
            <FormControl className="w-full">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={ANY}>{anyLabel}</SelectItem>
              {programmes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
