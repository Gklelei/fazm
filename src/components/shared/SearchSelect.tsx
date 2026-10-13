"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchSelectProps<T> {
  items: T[];
  value?: string | string[];
  onSelect: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  getSearchValue: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
}

export function SearchSelect<T>({
  items,
  value,
  onSelect,
  multiple = false,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  getValue,
  getLabel,
  getSearchValue,
  renderItem,
}: SearchSelectProps<T>) {
  const [open, setOpen] = React.useState(false);

  // Type-safe check for selection
  const isSelected = React.useCallback(
    (itemValue: string) => {
      if (multiple && Array.isArray(value)) {
        return value.includes(itemValue);
      }
      return value === itemValue;
    },
    [multiple, value]
  );

  const handleSelect = (itemValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? [...value] : [];
      const index = currentValues.indexOf(itemValue);

      if (index > -1) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(itemValue);
      }
      onSelect(currentValues);
    } else {
      onSelect(itemValue);
      setOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (multiple) {
      const allIds = items.map((item) => getValue(item));
      if (Array.isArray(value) && value.length === items.length) {
        onSelect([]);
      } else {
        onSelect(allIds);
      }
    }
  };

  const selectedDisplay = React.useMemo(() => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      return `${value.length} selected`;
    }
    const selected = items.find((item) => getValue(item) === value);
    return selected ? getLabel(selected) : placeholder;
  }, [items, value, getValue, getLabel, placeholder, multiple]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal min-h-11 h-auto py-2 px-3 border-slate-300 focus:ring-2 focus:ring-slate-900",
            multiple &&
              Array.isArray(value) &&
              value.length > 0 &&
              "bg-slate-50/50"
          )}
        >
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {multiple && Array.isArray(value) && value.length > 0 ? (
              items
                .filter((item) => value.includes(getValue(item)))
                .slice(0, 3)
                .map((item) => (
                  <Badge
                    key={getValue(item)}
                    variant="secondary"
                    className="bg-white border-slate-200 text-slate-700 font-medium animate-in fade-in zoom-in-95 duration-200"
                  >
                    {getLabel(item)}
                  </Badge>
                ))
            ) : (
              <span className="truncate text-slate-600">{selectedDisplay}</span>
            )}
            {multiple && Array.isArray(value) && value.length > 3 && (
              <Badge variant="outline" className="border-dashed">
                +{value.length - 3} more
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-slate-200"
        align="start"
      >
        <Command className="rounded-lg">
          <CommandInput placeholder={searchPlaceholder} className="h-11" />
          <CommandList className="max-h-75 overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-slate-500">
              {emptyMessage}
            </CommandEmpty>

            {multiple && items.length > 0 && (
              <>
                <CommandGroup>
                  <CommandItem
                    onSelect={handleSelectAll}
                    className="cursor-pointer font-medium text-slate-900"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        Array.isArray(value) && value.length === items.length
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50"
                      )}
                    >
                      {Array.isArray(value) &&
                        value.length === items.length && (
                          <Check className="h-3 w-3" />
                        )}
                    </div>
                    <Users className="mr-2 h-4 w-4 text-slate-500" />
                    {Array.isArray(value) && value.length === items.length
                      ? "Deselect All Athletes"
                      : "Select All Athletes"}
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            <CommandGroup>
              {items.map((item) => {
                const itemValue = getValue(item);
                const active = isSelected(itemValue);
                return (
                  <CommandItem
                    key={itemValue}
                    value={getSearchValue(item)}
                    onSelect={() => handleSelect(itemValue)}
                    className="cursor-pointer py-2 px-3"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "opacity-50 border-slate-400"
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1">
                      {renderItem ? renderItem(item) : getLabel(item)}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
