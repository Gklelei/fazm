"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRESETS } from "../lib/range";

/** Preset periods or a custom from/to; the page re-renders on the server. */
export function RangePicker({ preset, from, to }: { preset: string | null; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (q: Record<string, string>) => start(() => router.replace(`${pathname}?${new URLSearchParams(q)}`));

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Updating" />}
      <Select value={preset ?? "custom"} onValueChange={(v) => v !== "custom" && go({ range: v })}>
        <SelectTrigger className="w-40" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PRESETS).map(([k, label]) => (
            <SelectItem key={k} value={k}>
              {label}
            </SelectItem>
          ))}
          <SelectItem value="custom" disabled={!!preset}>
            Custom dates
          </SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label="From"
          className="w-38"
          value={from}
          max={to}
          onChange={(e) => e.target.value >= "2000" && go({ from: e.target.value, to })}
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="To"
          className="w-38"
          value={to}
          min={from}
          onChange={(e) => e.target.value >= "2000" && go({ from, to: e.target.value })}
        />
      </div>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}
