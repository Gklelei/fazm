"use client";

import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseUtilsContext } from "@/providers/UtilsContext";
import { ATHLETE_STATUS_LABEL } from "./AthleteRowActions";

const ALL = "all";

export type RosterFilterState = {
  search: string;
  status: string;
  batchId: string;
  from: string;
  to: string;
};

export default function AthletesFilterBar({
  value,
  onChange,
  busy,
}: {
  value: RosterFilterState;
  onChange: (next: Partial<RosterFilterState>) => void;
  busy: boolean;
}) {
  const batches = UseUtilsContext().data?.batches ?? [];
  const active = Object.values(value).some(Boolean);

  return (
    <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(14rem,1fr)_auto]">
      <div className="relative self-end">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search athletes"
          placeholder="Search name, ID, phone or guardian"
          className="pr-9 pl-9"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
        {busy && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={value.status || ALL}
            onValueChange={(v) => onChange({ status: v === ALL ? "" : v })}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any status</SelectItem>
              {Object.entries(ATHLETE_STATUS_LABEL).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Batch</Label>
          <Select
            value={value.batchId || ALL}
            onValueChange={(v) => onChange({ batchId: v === ALL ? "" : v })}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All batches</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="reg-from" className="text-xs text-muted-foreground">
            Registered from
          </Label>
          <Input
            id="reg-from"
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ from: e.target.value })}
            className="sm:w-38"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-to" className="text-xs text-muted-foreground">
            to
          </Label>
          <Input
            id="reg-to"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ to: e.target.value })}
            className="sm:w-38"
          />
        </div>

        {active && (
          <Button
            variant="ghost"
            className="col-span-2 sm:col-span-1"
            onClick={() =>
              onChange({ search: "", status: "", batchId: "", from: "", to: "" })
            }
          >
            <X /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
