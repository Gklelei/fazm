"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { METHOD_LABEL } from "../lib/methods";

const ALL = "all";

/** Filters live in the URL; the server renders the matching page. */
export function PaymentsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
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

  const filtered = ["search", "method", "from", "to"].some((k) => params.get(k));

  return (
    <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(14rem,1fr)_auto]">
      <div className="relative self-end">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search payments"
          placeholder="Search receipt, M-Pesa code, athlete or invoice"
          className="pr-9 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {pending && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="col-span-2 grid gap-1.5 sm:col-span-1">
          <Label className="text-xs text-muted-foreground">Method</Label>
          <Select value={params.get("method") || ALL} onValueChange={(v) => push({ method: v === ALL ? "" : v })}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any method</SelectItem>
              {Object.entries(METHOD_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pay-from" className="text-xs text-muted-foreground">Paid from</Label>
          <Input id="pay-from" type="date" defaultValue={params.get("from") ?? ""} onChange={(e) => push({ from: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pay-to" className="text-xs text-muted-foreground">to</Label>
          <Input id="pay-to" type="date" defaultValue={params.get("to") ?? ""} onChange={(e) => push({ to: e.target.value })} />
        </div>
        {filtered && (
          <Button
            variant="ghost"
            className="col-span-2 sm:col-span-1"
            onClick={() => {
              setSearch("");
              start(() => router.replace(pathname));
            }}
          >
            <X /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
