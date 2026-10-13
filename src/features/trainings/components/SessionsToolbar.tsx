"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { UseUtilsContext } from "@/providers/UtilsContext";
import type { SessionView } from "../queries/list-sessions";

const ALL = "all";

/** Filters live in the URL so a filtered view can be shared or reloaded. */
export function SessionsToolbar({ view }: { view: SessionView }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const batches = UseUtilsContext().data?.batches ?? [];
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debounced = useDebounce(search, 400);

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(`${pathname}?${next}`));
  };

  useEffect(() => {
    if (debounced !== (params.get("search") ?? "")) push({ search: debounced.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debounced]);

  const tab = (v: SessionView, label: string) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    next.delete("page");
    return (
      <Link
        href={`${pathname}?${next}`}
        aria-current={view === v ? "page" : undefined}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          view === v && "bg-background text-foreground shadow-sm",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
      <nav className="inline-flex w-fit rounded-lg bg-muted p-1" aria-label="Sessions">
        {tab("upcoming", "Upcoming")}
        {tab("past", "Past")}
      </nav>
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search sessions"
          placeholder="Search session, batch, location or coach"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {pending && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <Select
        value={params.get("batchId") || ALL}
        onValueChange={(v) => push({ batchId: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-full lg:w-44" aria-label="Batch">
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
  );
}
