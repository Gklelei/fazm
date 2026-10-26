"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveRestore, ArrowLeft, Gauge, History as HistoryIcon, Pencil, ReceiptText, TicketPercent, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CouponCode } from "./CouponCode";
import { LoadMore } from "@/components/shared/LoadMore";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { athleteName } from "@/features/athletes/lib/names";
import { setCouponArchived } from "../actions/coupons";
import { couponState, discountLabel, durationLabel } from "../lib/state";
import type { CouponRow } from "../queries/list";
import type { CouponInvoicesPage } from "../queries/usage";
import { CouponActionsMenu, CouponStateBadge } from "./CouponRowActions";
import { appliesTo } from "./CouponsList";

/** An athlete the coupon was given to */
type Given = { id: string; athleteId: string; name: string; status: "ACTIVE" | "ENDED" | "REMOVED"; invoicesLeft: number | null; createdAt: string };
type LogEntry = { id: string; details: string | null; createdAt: string; user: string | null };

const when = (d: string) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <Card className="border-none bg-muted/40 shadow-none">
      <CardContent className="flex flex-col items-center p-4 text-center">
        <span className="text-xs tracking-wider text-muted-foreground uppercase">{label}</span>
        <span className="tabular text-2xl font-bold">{value}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{children}</h2>
    </div>
  );
}

export function CouponDetails({
  coupon: c,
  invoices: initial,
  given,
  athletes,
  history,
}: {
  coupon: CouponRow;
  invoices: CouponInvoicesPage;
  given: number;
  athletes: Given[];
  history: LogEntry[];
}) {
  const router = useRouter();
  const [restoring, start] = useTransition();
  const state = couponState(c);
  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["coupon-invoices", c.id],
    queryFn: async ({ pageParam }): Promise<CouponInvoicesPage> => (await fetch(`/api/coupons/${c.id}/invoices?cursor=${pageParam}`)).json(),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [initial], pageParams: [""] } as InfiniteData<CouponInvoicesPage, string>,
  });
  const invoices = data.pages.flatMap((p) => p.items);
  const day = (d: string) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });
  const share = c.usageLimit ? Math.min(100, Math.round((c.uses / c.usageLimit) * 100)) : null;
  const active = athletes.filter((a) => a.status === "ACTIVE");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/coupons">
          <ArrowLeft /> Coupons
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CouponCode code={c.name} large />
            <CouponStateBadge state={state} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-primary">{c.discountType === "PERCENTAGE" ? `${c.value}% off` : `${formatCurrency(c.value)} off`}</span> ·{" "}
            {appliesTo(c)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state === "ARCHIVED" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={restoring}
              onClick={() =>
                start(async () => {
                  const res = await setCouponArchived(c.id, false);
                  if (!res.success) return void toast.error(res.message);
                  toast.success(res.message);
                  router.refresh();
                })
              }
            >
              <ArchiveRestore /> Restore
            </Button>
          ) : (
            <>
              <Button size="sm" asChild>
                <Link href={`/coupons/${c.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <CouponActionsMenu coupon={c} onPage onChanged={() => router.refresh()} />
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <Card className="gap-3 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TicketPercent className="size-4 text-muted-foreground" /> Coupon details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Detail label="Discount">{discountLabel(c, formatCurrency)}</Detail>
            <Detail label="Lasts">{durationLabel(c)}</Detail>
            <Detail label="Valid from">{day(c.startDate)}</Detail>
            <Detail label="Valid until">{c.expiryDate ? day(c.expiryDate) : "No end date"}</Detail>
            <Detail label="Fee plans">{c.plans.map((p) => p.name).join(", ") || "Any charge"}</Detail>
            <Detail label="Per athlete">{c.oncePerAthlete ? "Once" : "No limit"}</Detail>
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Gauge className="size-4 text-muted-foreground" /> Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="tabular text-3xl font-bold">
              {c.uses}
              <span className="text-lg font-normal text-muted-foreground"> / {c.usageLimit ?? "∞"}</span>
            </p>
            {share != null && (
              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className={cn("h-full rounded-full", share >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${share}%` }} />
              </div>
            )}
            <p className="text-muted-foreground">{c.usageLimit ? `${Math.max(c.usageLimit - c.uses, 0)} left to use` : "No limit on uses"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Times used" value={c.uses} />
        <Stat label="Discount given" value={formatCurrency(given)} />
        <Stat label="Invoices" value={data.pages[0]?.total ?? invoices.length} />
        <Stat label="Still discounting" value={active.length} note="athletes" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <SectionTitle icon={ReceiptText}>Invoices</SectionTitle>
          <Card className="overflow-hidden py-0">
            {invoices.length === 0 ? (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Not used on an invoice yet.</CardContent>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Invoice</TableHead>
                        <TableHead>Athlete</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="pr-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="pl-4">
                            <Link href={`/invoices/${i.invoiceNumber}`} className="font-mono text-sm hover:underline">
                              {i.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/players/user-profile/${i.athlete.athleteId}`} className="font-medium hover:underline">
                              {athleteName(i.athlete)}
                            </Link>
                          </TableCell>
                          <TableCell className="tabular whitespace-nowrap text-muted-foreground">{day(i.createdAt)}</TableCell>
                          <TableCell className="tabular text-right font-medium">−{formatCurrency(i.discount)}</TableCell>
                          <TableCell className="pr-4">
                            <StatusBadge status={i.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <LoadMore
                  shown={invoices.length}
                  total={data.pages[0]?.total}
                  noun={["invoice", "invoices"]}
                  hasNextPage={!!hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                />
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <SectionTitle icon={Users}>Given to</SectionTitle>
            <Card className="overflow-hidden py-0">
              {athletes.length === 0 ? (
                <CardContent className="p-6 text-center text-sm text-muted-foreground">Not given to an athlete yet.</CardContent>
              ) : (
                <ul className="divide-y">
                  {athletes.map((a) => (
                    <li key={a.id}>
                      <Link href={`/players/user-profile/${a.athleteId}`} className="flex items-center gap-3 px-4 py-2.5 leading-tight hover:bg-muted/40">
                        <span className="grid min-w-0 flex-1">
                          <span className="font-medium">{a.name}</span>
                          <span className="text-sm text-muted-foreground">
                            <span className="font-mono text-xs">{a.athleteId}</span> · given {day(a.createdAt)}
                          </span>
                        </span>
                        <span className="text-right text-xs text-muted-foreground">
                          {a.status === "ACTIVE"
                            ? a.invoicesLeft == null
                              ? "Every fees invoice"
                              : `${a.invoicesLeft} invoice${a.invoicesLeft === 1 ? "" : "s"} left`
                            : a.status === "ENDED"
                              ? "Used"
                              : "Removed"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-3">
            <SectionTitle icon={HistoryIcon}>History</SectionTitle>
            <Card className="py-0">
              {history.length === 0 ? (
                <CardContent className="p-6 text-center text-sm text-muted-foreground">No changes yet.</CardContent>
              ) : (
                <ol className="space-y-3 p-4">
                  {history.map((h) => (
                    <li key={h.id} className="border-l-2 border-primary/25 pl-3 text-sm">
                      <p>{h.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.user ?? "System"} · {when(h.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
