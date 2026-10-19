"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import type { DrillRecord, DrillResult, Series } from "../queries/records";

export type DrillSpec = { title: string; series: Series; from: string; to: string; batch?: string; method?: string; category?: string };
type Ctx = { range: { from: string; to: string }; open: (d: Omit<DrillSpec, "from" | "to"> & { from?: string; to?: string }) => void };

const DrillContext = createContext<Ctx | null>(null);
export const useDrill = () => useContext(DrillContext)!;

const day = (d: string) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
const exportRow = (r: DrillRecord, i: number) => [String(i + 1), day(r.date), r.source, r.title, r.detail, String(r.amount)];

function Records({ spec }: { spec: DrillSpec }) {
  const { title, ...q } = spec;
  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-records", params.toString()],
    queryFn: async (): Promise<DrillResult> => {
      const res = await fetch(`/api/reports/records?${params}`);
      if (!res.ok) throw new Error("Couldn't load the records");
      return res.json();
    },
  });
  if (isPending) return <Loader2 className="mx-auto mt-10 size-5 animate-spin text-muted-foreground" />;
  if (isError)
    return (
      <div className="grid place-items-center gap-3 py-10 text-center text-sm">
        <p>The records didn&apos;t load.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw /> Try again
        </Button>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-4">
        <p className="text-sm">
          <span className="tabular font-display text-2xl font-bold">{formatCurrency(data.total)}</span>
          <span className="ml-2 text-muted-foreground">
            {data.rows.length} {data.rows.length === 1 ? "record" : "records"}
            {data.more && ", the latest shown"}
          </span>
        </p>
        <ExportDropdown<DrillRecord> filename={title} headers={["#", "Date", "Kind", "Who or what", "Details", "Amount (KES)"]} rows={data.rows.map(exportRow)} />
      </div>
      {data.rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing recorded.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto border-t">
          {data.rows.map((r) => {
            const body = (
              <>
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-medium">{r.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {day(r.date)} · {r.source} · {r.detail}
                  </span>
                </span>
                <span className="tabular shrink-0 font-mono font-semibold">{formatCurrency(r.amount)}</span>
              </>
            );
            return (
              <li key={r.id}>
                {r.href ? (
                  <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-muted/40">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Opens the records behind any bar or row of the Reports page in a side panel. */
export function DrillProvider({ from, to, children }: { from: string; to: string; children: React.ReactNode }) {
  const [spec, setSpec] = useState<DrillSpec | null>(null);
  const open: Ctx["open"] = (d) => setSpec({ ...d, from: d.from ?? from, to: d.to ?? to });
  return (
    <DrillContext.Provider value={{ range: { from, to }, open }}>
      {children}
      <Sheet open={!!spec} onOpenChange={(v) => !v && setSpec(null)}>
        <SheetContent className="flex w-full flex-col gap-3 p-0 sm:max-w-lg">
          {spec && (
            <>
              <SheetHeader className="px-4 pt-4 pb-0">
                <SheetTitle>{spec.title}</SheetTitle>
                <SheetDescription>{spec.from === spec.to ? day(spec.from) : `${day(spec.from)} – ${day(spec.to)}`}</SheetDescription>
              </SheetHeader>
              <Records key={JSON.stringify(spec)} spec={spec} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </DrillContext.Provider>
  );
}

/** Ranked rows with a share-of-total bar; each row opens its records. */
export function DrillList({
  rows,
  empty,
  unit = "",
  series,
  by,
  title,
}: {
  rows: { name: string; amount: number; count: number }[];
  empty: React.ReactNode;
  unit?: string;
  /** Each row's records: this series, filtered by the row's name (or, without `by`, the row names a series) */
  series?: Series;
  by?: "batch" | "method" | "category";
  title?: string;
}) {
  const { open } = useDrill();
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (!rows.length || !total) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const share = r.amount / total;
        return (
          <li key={r.name}>
            <button
              type="button"
              onClick={() =>
                open({
                  title: title ? `${title} · ${r.name}` : r.name,
                  series: series ?? (r.name.toLowerCase() as Series),
                  ...(by && { [by]: r.name }),
                })
              } className="block w-full px-4 py-2.5 text-left hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 font-medium break-words">{r.name}</span>
                <span className="tabular shrink-0 font-mono font-semibold">{formatCurrency(r.amount)}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(share * 100, 1)}%` }} />
                </span>
                <span className="tabular w-32 shrink-0 text-right text-xs text-muted-foreground">
                  {r.count}
                  {unit && ` ${unit}${r.count === 1 ? "" : "s"}`} · {Math.round(share * 100)}%
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
