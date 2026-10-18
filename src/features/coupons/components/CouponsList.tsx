"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadMore } from "@/components/shared/LoadMore";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import type { CouponRow, CouponsPage } from "../queries/list";
import { COUPON_STATE_LABEL, couponState, discountLabel, type CouponState } from "../lib/state";
import { CouponActionsMenu, CouponStateBadge } from "./CouponRowActions";

const ALL = "all";
const STATES: CouponState[] = ["ON", "OFF", "NOT_STARTED", "EXPIRED", "USED_UP"];

const day = (d: string) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
export const validity = (c: { startDate: string; expiryDate: string | null }) => (c.expiryDate ? `${day(c.startDate)} – ${day(c.expiryDate)}` : `From ${day(c.startDate)}`);
export const appliesTo = (c: { interval: string; plans: { name: string }[] }) =>
  `${c.interval === "REPEATING" ? "Each fees invoice" : "One invoice"}${c.plans.length ? ` · ${c.plans.map((p) => p.name).join(", ")}` : ""}`;
const usage = (c: CouponRow) => (c.usageLimit != null ? `${c.timesUsed} of ${c.usageLimit}` : String(c.timesUsed));

const exportRow = (c: CouponRow, i: number) => [
  String(i + 1),
  c.name,
  discountLabel(c, formatCurrency),
  appliesTo(c),
  usage(c),
  c.oncePerAthlete ? "Yes" : "No",
  validity(c),
  COUPON_STATE_LABEL[couponState(c)],
];

export function CouponsList({ initial }: { initial: CouponsPage }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const q = useDebounce(search, 300).trim();
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("search", q);
    if (state) p.set("state", state);
    return p.toString();
  }, [q, state]);
  const filtered = !!params;

  const { data, isPending, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ["coupons", params],
    queryFn: async ({ pageParam }): Promise<CouponsPage> => {
      const p = new URLSearchParams(params);
      if (pageParam) p.set("cursor", pageParam);
      const res = await fetch(`/api/coupons?${p}`);
      if (!res.ok) throw new Error("Couldn't load coupons");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: params ? undefined : ({ pages: [initial], pageParams: [""] } as InfiniteData<CouponsPage, string>),
  });
  const coupons = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const changed = () => void queryClient.invalidateQueries({ queryKey: ["coupons"] });
  const clear = () => {
    setSearch("");
    setState("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Discount codes for invoices and fee plans."
        actions={
          <>
            <ExportDropdown<CouponRow>
              filename="Coupons"
              headers={["#", "Code", "Discount", "Applies to", "Used", "Once per athlete", "Valid", "State"]}
              rows={coupons.map(exportRow)}
              fetchAllUrl={`/api/export?resource=coupons&${params}`}
              mapRow={exportRow}
            />
            <Button asChild>
              <Link href="/coupons/new">
                <Plus /> New coupon
              </Link>
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search coupons"
              placeholder="Search code"
              className="pr-9 pl-9 uppercase placeholder:normal-case"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isFetching && !isFetchingNextPage && (
              <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <Select value={state || ALL} onValueChange={(v) => setState(v === ALL ? "" : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any state</SelectItem>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {COUPON_STATE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtered && (
            <Button variant="ghost" onClick={clear} className="justify-self-start">
              <X /> Clear
            </Button>
          )}
        </div>

        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">The coupons didn&apos;t load.</p>
            <p className="text-sm text-muted-foreground">Check your connection, then try again.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw /> Try again
            </Button>
          </div>
        ) : coupons.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            {filtered ? (
              <>
                <p className="font-medium">No coupons match.</p>
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium">No coupons yet.</p>
                <Button asChild>
                  <Link href="/coupons/new">
                    <Plus /> New coupon
                  </Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {isMobile ? (
              <div className="divide-y">
                {coupons.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <Link href={`/coupons/${c.id}`} className="grid min-w-0 gap-1 leading-tight">
                      <span className="font-mono font-semibold">{c.name}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {discountLabel(c, formatCurrency)} · {appliesTo(c)}
                      </span>
                      <span className="flex items-center gap-2 pt-0.5">
                        <CouponStateBadge state={couponState(c)} />
                        <span className="tabular text-xs text-muted-foreground">Used {usage(c)}</span>
                      </span>
                    </Link>
                    <CouponActionsMenu coupon={c} onChanged={changed} />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead>Valid</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="w-12 pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-4">
                        <Link href={`/coupons/${c.id}`} className="font-mono font-semibold hover:underline">
                          {c.name}
                        </Link>
                        {c.oncePerAthlete && <span className="ml-2 text-xs text-muted-foreground">once per athlete</span>}
                      </TableCell>
                      <TableCell className="tabular">{discountLabel(c, formatCurrency)}</TableCell>
                      <TableCell>{appliesTo(c)}</TableCell>
                      <TableCell className="tabular text-right">{usage(c)}</TableCell>
                      <TableCell className="tabular whitespace-nowrap text-muted-foreground">{validity(c)}</TableCell>
                      <TableCell>
                        <CouponStateBadge state={couponState(c)} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <CouponActionsMenu coupon={c} onChanged={changed} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <LoadMore
              shown={coupons.length}
              total={data?.pages[0]?.total}
              noun={["coupon", "coupons"]}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
