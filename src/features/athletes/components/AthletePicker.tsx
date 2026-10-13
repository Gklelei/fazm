"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { athleteName } from "../lib/names";
import type { AthletesPage } from "../queries/list";

export type PickedAthlete = { athleteId: string; name: string };

/**
 * Search-as-you-type athlete chooser (name, ID, phone or guardian), so
 * forms never have to load the whole roster up front.
 */
export function AthletePicker({
  value,
  onChange,
  id,
  invalid,
}: {
  value: PickedAthlete | null;
  onChange: (athlete: PickedAthlete | null) => void;
  id?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 250).trim();

  const { data, isFetching } = useQuery({
    queryKey: ["athlete-picker", q],
    enabled: open,
    queryFn: async (): Promise<AthletesPage> => {
      const p = new URLSearchParams({ pageSize: "8" });
      if (q) p.set("search", q);
      const res = await fetch(`/api/athlete/athletes-all?${p}`);
      if (!res.ok) throw new Error("Couldn't search athletes");
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="truncate">
              {value.name} <span className="font-mono text-xs text-muted-foreground">{value.athleteId}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Choose athlete</span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Name, ID, phone or guardian"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && !data ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty>No athlete found.</CommandEmpty>
            )}
            {data?.allAthletes.map((a) => {
              const name = athleteName(a);
              return (
                <CommandItem
                  key={a.athleteId}
                  value={a.athleteId}
                  onSelect={() => {
                    onChange({ athleteId: a.athleteId, name });
                    setOpen(false);
                  }}
                >
                  <Check className={cn(value?.athleteId === a.athleteId ? "opacity-100" : "opacity-0")} />
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate">{name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {a.athleteId}
                      {a.batches && ` · ${a.batches.name}`}
                    </span>
                  </span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
