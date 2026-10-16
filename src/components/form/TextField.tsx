"use client";

import { useFormContext, type FieldPath, type FieldValues } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/** Label, input, hint and error for one text field in a react-hook-form form. */
export function TextField<T extends FieldValues>({
  name,
  label,
  hint,
  optional,
  className,
  ...input
}: {
  name: FieldPath<T>;
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "name">) {
  const { control } = useFormContext<T>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
          </FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ""} {...input} className="h-11" />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
