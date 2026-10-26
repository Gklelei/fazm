"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { CalendarDays, Loader2, Plus, RefreshCcw, Search, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { CouponRow, CouponsPage } from "../queries/list";
import { COUPON_STATE_LABEL, couponState, discountLabel, type CouponState, durationLabel } from "../lib/state";
import { CouponActionsMenu, CouponStateBadge } from "./CouponRowActions";
import { CouponCode } from "./CouponCode";

const ALL = "all";
const STATES: CouponState[] = ["ON", "OFF", "NOT_STARTED", "EXPIRED", "USED_UP"];

const day = (d: string) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
export const validity = (c: { startDate: string; expiryDate: string | null }) => (c.expiryDate ? `${day(c.startDate)} – ${day(c.expiryDate)}` : `From ${day(c.startDate)}`);
export const appliesTo = (c: { duration: string; durationCount: number | null; plans: { name: string }[] }) =>
  `${durationLabel(c)}${c.plans.length ? ` · ${c.plans.map((p) => p.name).join(", ")}` : ""}`;
const usage = (c: CouponRow) => (c.usageLimit != null ? `${c.uses} of ${c.usageLimit}` : String(c.uses));

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
                      <CouponCode code={c.name} />
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
                    <TableHead>Fee plans</TableHead>
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
                        <div className="flex items-center gap-1">
                          <Link href={`/coupons/${c.id}`} className="hover:underline">
                            <CouponCode code={c.name} />
                          </Link>
                        </div>
                        {c.oncePerAthlete && <span className="mt-1 block text-xs text-muted-foreground">Once per athlete</span>}
                      </TableCell>
                      <TableCell>
                        <span className="tabular block font-bold text-primary">{c.discountType === "PERCENTAGE" ? `${c.value}% off` : `−${formatCurrency(c.value)}`}</span>
                        <span className="text-xs text-muted-foreground">{durationLabel(c)}</span>
                      </TableCell>
                      <TableCell className="text-sm">{c.plans.length ? c.plans.map((p) => p.name).join(", ") : <span className="text-muted-foreground">Any charge</span>}</TableCell>
                      <TableCell className="tabular text-right text-sm">
                        <span className="font-medium">{c.uses}</span>
                        <span className="mx-1 text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{c.usageLimit ?? "∞"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {formatAcademy(c.startDate, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {c.expiryDate && (
                          <span className={cn("text-xs", new Date(c.expiryDate) < new Date() ? "text-destructive" : "text-muted-foreground")}>
                            {new Date(c.expiryDate) < new Date() ? "Expired" : "Expires"} {formatAcademy(c.expiryDate, { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </TableCell>
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
