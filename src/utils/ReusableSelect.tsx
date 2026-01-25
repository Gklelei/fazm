"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type GenericSelectProps<T> = {
  items: T[];
  valueKey: keyof T;
  labelKey: keyof T;

  placeholder: string;
  label?: string;

  value?: string;
  onValueChange?: (value: string) => void;

  className?: string;
  disabled?: boolean; // <-- new prop
};

export function GenericSelect<T extends Record<string, any>>({
  items,
  valueKey,
  labelKey,
  placeholder,
  label,
  value,
  onValueChange,
  className,
  disabled = false, // default to false
}: GenericSelectProps<T>) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className ?? "w-45"} disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {label && <SelectLabel>{label}</SelectLabel>}

          {items.map((item) => (
            <SelectItem
              key={String(item[valueKey])}
              value={String(item[valueKey])}
            >
              {String(item[labelKey])}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
