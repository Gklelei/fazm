"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseUtilsContext } from "@/Modules/Context/UtilsContext";
import { Search, Loader2, XCircle, UserPlus, ShieldCheck } from "lucide-react";

const ALL_BATCHES = "all";

interface Props {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  debouncedSearchValue: string;
  isSearching: boolean;
  isRefetching: boolean;
  from: string;
  setFrom: (s: string) => void;
  to: string;
  setTo: (s: string) => void;
  batchId: string;
  setBatchId: (s: string) => void;
  hasFilters: boolean;
  clearFilters: () => void;
}

export default function AthletesFilterBar({
  searchQuery,
  setSearchQuery,
  debouncedSearchValue,
  isSearching,
  isRefetching,
  from,
  setFrom,
  to,
  setTo,
  batchId,
  setBatchId,
  hasFilters,
  clearFilters,
}: Props) {
  const router = useRouter();
  const batches = UseUtilsContext().data?.batches ?? [];

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">
              Athlete Roster
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Search athletes, update status, and manage profiles.
          </p>
        </div>

        <Button
          onClick={() => router.push("/players/create")}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" /> Register athlete
        </Button>
      </div>

      <CardHeader className="pb-3 border-b px-0 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, ID, phone or guardian…"
              aria-label="Search athletes"
              className="pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {(isSearching || isRefetching) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Registered from
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className="sm:w-40"
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Registered to
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className="sm:w-40"
              />
            </label>
            <label className="col-span-2 grid gap-1 text-xs text-muted-foreground sm:col-span-1">
              Batch
              <Select
                value={batchId || ALL_BATCHES}
                onValueChange={(v) => setBatchId(v === ALL_BATCHES ? "" : v)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BATCHES}>All batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {hasFilters ? (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="col-span-2 gap-2 sm:col-span-1"
              >
                <XCircle className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {debouncedSearchValue ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing results for{" "}
            <span className="font-medium">{debouncedSearchValue}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: search by name, athlete ID, phone number, or guardian name,
            phone or email. Pick a batch, then Export → PDF to print its
            roster.
          </p>
        )}
      </CardHeader>
    </>
  );
}
