"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { Search, Loader2, XCircle, UserPlus, ShieldCheck } from "lucide-react";

interface Props {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  debouncedSearchValue: string;
  isSearching: boolean;
  isRefetching: boolean;
}

export default function AthletesFilterBar({
  searchQuery,
  setSearchQuery,
  debouncedSearchValue,
  isSearching,
  isRefetching,
}: Props) {
  const router = useRouter();

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
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or athlete ID…"
              className="pl-10 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {(isSearching || isRefetching) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {debouncedSearchValue ? (
            <Button
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>

        {debouncedSearchValue ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing results for{" "}
            <span className="font-medium">{debouncedSearchValue}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: search works by name and athlete ID.
          </p>
        )}
      </CardHeader>
    </>
  );
}
