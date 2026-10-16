"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { AREAS, KINDS, type Kind } from "../lib/catalog";

const ALL = "all";

/** View switch and filters, kept in the URL so a filtered view can be shared or reloaded. */
export function ActivityToolbar({ kind, people }: { kind: Kind; people: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debounced = useDebounce(search, 400);

  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `${pathname}?${next}`;
  };
  const push = (patch: Record<string, string>) => start(() => router.replace(href(patch), { scroll: false }));

  useEffect(() => {
    if (debounced.trim() !== (params.get("q") ?? "")) push({ q: debounced.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debounced]);

  const filtered = ["person", "area", "from", "to", "q"].some((k) => params.get(k));

  return (
    <div className="space-y-3 border-b p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="What to show">
          <div className="inline-flex rounded-lg bg-muted p-1">
            {KINDS.map((k) => (
              <Link
                key={k.key}
                href={href({ kind: k.key === "changes" ? "" : k.key })}
                scroll={false}
                aria-current={kind === k.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  kind === k.key && "bg-background text-foreground shadow-sm",
                )}
              >
                {k.label}
              </Link>
            ))}
          </div>
        </nav>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto_auto_auto]">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search the log"
            placeholder="Search what happened, a record or a name"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={params.get("person") || ALL} onValueChange={(v) => push({ person: v === ALL ? "" : v })}>
          <SelectTrigger className="w-full" aria-label="Person">
            <SelectValue placeholder="Everyone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Everyone</SelectItem>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.get("area") || ALL} onValueChange={(v) => push({ area: v === ALL ? "" : v })}>
          <SelectTrigger className="w-full" aria-label="Area">
            <SelectValue placeholder="All areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {AREAS.map((a) => (
              <SelectItem key={a.key} value={a.key}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 rounded-md border bg-background pl-3 text-sm text-muted-foreground focus-within:ring-[3px] focus-within:ring-ring/50">
          From
          <input
            type="date"
            className="h-9 min-w-0 flex-1 bg-transparent pr-2 text-foreground outline-none"
            value={params.get("from") ?? ""}
            max={params.get("to") || undefined}
            onChange={(e) => push({ from: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 rounded-md border bg-background pl-3 text-sm text-muted-foreground focus-within:ring-[3px] focus-within:ring-ring/50">
          To
          <input
            type="date"
            className="h-9 min-w-0 flex-1 bg-transparent pr-2 text-foreground outline-none"
            value={params.get("to") ?? ""}
            min={params.get("from") || undefined}
            onChange={(e) => push({ to: e.target.value })}
          />
        </label>
        <Button
          variant="ghost"
          className="col-span-2 lg:col-span-1"
          disabled={!filtered}
          onClick={() => {
            setSearch("");
            push({ person: "", area: "", from: "", to: "", q: "" });
          }}
        >
          <X /> Clear
        </Button>
      </div>
    </div>
  );
}
