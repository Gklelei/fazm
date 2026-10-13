"use client";

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
  disabled?: boolean;
};

export function GenericSelect<T extends object>({
  items,
  valueKey,
  labelKey,
  placeholder,
  label,
  value,
  onValueChange,
  className,
  disabled = false,
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
