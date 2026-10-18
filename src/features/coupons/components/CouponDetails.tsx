"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveRestore, ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadMore } from "@/components/shared/LoadMore";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { athleteName } from "@/features/athletes/lib/names";
import { setCouponArchived } from "../actions/coupons";
import { couponState, discountLabel } from "../lib/state";
import type { CouponRow } from "../queries/list";
import type { CouponInvoicesPage } from "../queries/usage";
import { CouponActionsMenu, CouponStateBadge } from "./CouponRowActions";
import { appliesTo, validity } from "./CouponsList";

type FeePlan = { id: string; athleteId: string; name: string; plan: string };
type LogEntry = { id: string; details: string | null; createdAt: string; user: string | null };

const when = (d: string) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{children}</dd>
    </div>
  );
}

function Panel({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;

export function CouponDetails({
  coupon: c,
  invoices: initial,
  given,
  feePlans,
  history,
}: {
  coupon: CouponRow;
  given: number;
  invoices: CouponInvoicesPage;
  feePlans: FeePlan[];
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/coupons">
          <ArrowLeft /> Coupons
        </Link>
      </Button>

      <PageHeader
        title={<span className="font-mono normal-case">{c.name}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CouponStateBadge state={state} />
            <span className="font-medium text-foreground">{discountLabel(c, formatCurrency)} off</span>
            <span>· {appliesTo(c)}</span>
          </span>
        }
        actions={
          state === "ARCHIVED" ? (
            <Button
              variant="outline"
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
              <Button asChild>
                <Link href={`/coupons/${c.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <CouponActionsMenu coupon={c} onPage onChanged={() => router.refresh()} />
            </>
          )
        }
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <Fact label="Used">
          <span className="tabular">{c.usageLimit != null ? `${c.timesUsed} of ${c.usageLimit}` : `${c.timesUsed} times`}</span>
        </Fact>
        <Fact label="Valid">{validity(c)}</Fact>
        <Fact label="Per athlete">{c.oncePerAthlete ? "Once" : "No limit"}</Fact>
        <Fact label="Fee plans">{c.plans.map((p) => p.name).join(", ") || "Any charge"}</Fact>
      </dl>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Panel
            title="Invoices"
            aside={
              invoices.length > 0 && (
                <span className="tabular text-sm text-muted-foreground">{formatCurrency(given)} off in all</span>
              )
            }
          >
            {invoices.length === 0 ? (
              <Empty>Not used on an invoice yet.</Empty>
            ) : (
              <>
                <ul className="divide-y">
                  {invoices.map((i) => (
                    <li key={i.id}>
                      <Link href={`/invoices/${i.invoiceNumber}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40">
                        <span className="grid min-w-0 leading-tight">
                          <span className="truncate font-medium">{athleteName(i.athlete)}</span>
                          <span className="truncate text-sm text-muted-foreground">
                            <span className="font-mono text-xs">{i.invoiceNumber}</span> · {formatAcademy(i.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="tabular font-medium">−{formatCurrency(i.discount)}</span>
                          <StatusBadge status={i.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
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
          </Panel>
        </div>

        <div className="space-y-6 xl:col-span-2">
          {c.interval === "REPEATING" && (
            <Panel title="On fee plans">
              {feePlans.length === 0 ? (
                <Empty>Not on any athlete&apos;s fee plan.</Empty>
              ) : (
                <ul className="divide-y">
                  {feePlans.map((f) => (
                    <li key={f.id}>
                      <Link href={`/players/user-profile/${f.athleteId}`} className="grid px-4 py-2.5 leading-tight hover:bg-muted/40">
                        <span className="font-medium">{f.name}</span>
                        <span className="text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{f.athleteId}</span> · {f.plan}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title="History">
            {history.length === 0 ? (
              <Empty>No changes yet.</Empty>
            ) : (
              <ol className="divide-y">
                {history.map((h) => (
                  <li key={h.id} className="px-4 py-2.5 text-sm">
                    <p>{h.details}</p>
                    <p className="text-muted-foreground">
                      {h.user ?? "System"} · {when(h.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
