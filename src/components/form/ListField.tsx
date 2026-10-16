"use client";

import { useFieldArray, useFormContext, type ArrayPath, type FieldValues, type Path } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A list of short items, one row each (allergies, conditions...), built on
 * react-hook-form's useFieldArray. Items are { name } objects.
 */
export function ListField<T extends FieldValues>({
  name,
  itemLabel,
  placeholder,
  emptyText,
  max = 20,
}: {
  name: ArrayPath<T>;
  /** e.g. "allergy": used in "Add an allergy" and row labels */
  itemLabel: string;
  placeholder?: string;
  emptyText: string;
  max?: number;
}) {
  const { control, register, formState } = useFormContext<T>();
  const { fields, append, remove } = useFieldArray({ control, name });
  const article = /^[aeiou]/i.test(itemLabel) ? "an" : "a";
  const rowError = (i: number) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested error lookup by path
    ((formState.errors as any)[name]?.[i]?.name?.message as string | undefined) ?? null;

  return (
    <div className="space-y-2">
      {fields.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
      {fields.map((f, i) => (
        <div key={f.id} className="space-y-1">
          <div className="flex gap-2">
            <Input
              {...register(`${name}.${i}.name` as Path<T>)}
              aria-label={`${itemLabel} ${i + 1}`}
              placeholder={placeholder}
              autoFocus={i === fields.length - 1 && i > 0}
              className="h-11"
            />
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" onClick={() => remove(i)} aria-label={`Remove ${itemLabel} ${i + 1}`}>
              <X />
            </Button>
          </div>
          {rowError(i) && <p className="text-sm text-destructive">{rowError(i)}</p>}
        </div>
      ))}
      {fields.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- { name } row
          onClick={() => append({ name: "" } as any)}
        >
          <Plus /> Add {article} {itemLabel}
        </Button>
      )}
    </div>
  );
}
