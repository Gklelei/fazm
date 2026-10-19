"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Archive, ArchiveRestore, Loader2, MoreHorizontal, PackagePlus, Pencil, Plus, RefreshCcw, Search, Shirt, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadMore } from "@/components/shared/LoadMore";
import ExportDropdown from "@/components/shared/ExportDropdown";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatAcademy } from "@/lib/academy-time";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { archiveProduct } from "../actions/shop";
import type { Catalogue, MovementRow, MovementsPage, ProductRow, SaleRow, SalesPage } from "../queries";
import { PRODUCT_CATEGORIES, SALE_PAYMENTS } from "../schemas";
import { ProductDialog } from "./ProductDialog";
import { StockDialog } from "./StockDialogs";

const ALL = "all";
const when = (d: string) => formatAcademy(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const categoryLabel = (c: string) => PRODUCT_CATEGORIES.find((x) => x.value === c)?.label ?? c;
const sizeLabel = (v: { size: string; colour: string }) => [v.size || "One size", v.colour].filter(Boolean).join(" · ");
export const SALE_STATUS_LABEL = { PAID: "Paid", ON_ACCOUNT: "On account", CANCELLED: "Cancelled" } as const;
const SALE_TONE = { PAID: "success", ON_ACCOUNT: "warning", CANCELLED: "neutral" } as const;
const MOVE_LABEL: Record<string, string> = { RECEIVED: "Received", SOLD: "Sold", RETURNED: "Back from a cancelled sale", ADJUSTED: "Corrected" };
export const paidBy = (s: { status: string; paymentType: string | null }) =>
  s.status === "ON_ACCOUNT" ? "Athlete's account" : (SALE_PAYMENTS.find((p) => p.value === s.paymentType)?.label ?? "—");

export const SaleStatusBadge = ({ status }: { status: SaleRow["status"] }) => <StatusBadge tone={SALE_TONE[status]}>{SALE_STATUS_LABEL[status]}</StatusBadge>;

function ProductCard({ p, low, onEdit, onStock }: { p: ProductRow; low: number; onEdit: () => void; onStock: (m: "receive" | "count") => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const archive = (archived: boolean) =>
    start(async () => {
      const res = await archiveProduct(p.id, archived);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });
  const total = p.variants.reduce((s, v) => s + v.stock, 0);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="relative aspect-[16/9] bg-muted">
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt="" className="size-full object-cover" />
        ) : (
          <Shirt className="absolute inset-0 m-auto size-12 text-muted-foreground/40" />
        )}
        <span className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium">{categoryLabel(p.category)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{p.name}</h3>
            <p className="tabular font-display text-xl font-bold text-primary">{formatCurrency(p.price)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Actions for ${p.name}`} disabled={pending}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onStock("receive")}>
                <PackagePlus /> Receive stock
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onStock("count")}>
                <SlidersHorizontal /> Correct stock
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => archive(true)}>
                <Archive /> Take off sale
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Stock by size">
          {p.variants.map((v) => (
            <li
              key={v.id}
              className={cn(
                "rounded-md border px-2 py-1 text-xs leading-none",
                v.stock === 0 ? "border-destructive/30 bg-destructive/10 text-destructive" : v.stock <= low ? "border-warning/40 bg-warning/15" : "bg-muted/40",
              )}
            >
              <span className="font-medium">{sizeLabel(v)}</span> <span className="tabular font-mono">{v.stock}</span>
            </li>
          ))}
        </ul>
        <p className="mt-auto text-xs text-muted-foreground">{total} in stock</p>
      </div>
    </article>
  );
}

function CatalogueTab({ data, archived }: { data: Catalogue; archived: Catalogue | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [stock, setStock] = useState<{ p: ProductRow; mode: "receive" | "count" } | null>(null);
  const [, start] = useTransition();
  const low = data.products.flatMap((p) => p.variants.filter((v) => v.stock <= data.lowStockLevel).map((v) => `${p.name} ${sizeLabel(v)}`));

  return (
    <div className="space-y-4">
      {low.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            <span className="font-medium">{low.length === 1 ? "1 size is" : `${low.length} sizes are`} low on stock:</span> {low.slice(0, 6).join(", ")}
            {low.length > 6 && ` and ${low.length - 6} more`}
          </span>
        </p>
      )}
      {data.products.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-lg border border-dashed px-4 py-14 text-center">
          <p className="font-medium">No products yet.</p>
          <Button onClick={() => setEditing("new")}>
            <Plus /> Add product
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} p={p} low={data.lowStockLevel} onEdit={() => setEditing(p)} onStock={(mode) => setStock({ p, mode })} />
          ))}
          <button type="button" onClick={() => setEditing("new")} className="grid min-h-48 place-items-center rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground">
            <span className="flex items-center gap-2">
              <Plus className="size-4" /> Add product
            </span>
          </button>
        </div>
      )}
      {archived && archived.products.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Off sale</h2>
          <ul className="divide-y rounded-lg border bg-card">
            {archived.products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  {p.name} <span className="text-muted-foreground">· {formatCurrency(p.price)}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    start(async () => {
                      const res = await archiveProduct(p.id, false);
                      if (!res.success) return void toast.error(res.message);
                      toast.success(res.message);
                      router.refresh();
                    })
                  }
                >
                  <ArchiveRestore /> Put back on sale
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && <ProductDialog product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {stock && <StockDialog product={stock.p} mode={stock.mode} onClose={() => setStock(null)} />}
    </div>
  );
}

const saleExport = (s: SaleRow, i: number) => [String(i + 1), s.saleNumber, when(s.createdAt), s.customer ?? "Walk-in", s.summary, String(s.items), String(s.total), paidBy(s), s.reference ?? "", SALE_STATUS_LABEL[s.status]];

function SalesTab({ initial, summary }: { initial: SalesPage; summary: { total: number; sales: number; onAccount: number; items: number; top: { name: string; quantity: number; amount: number }[] } }) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounce(search, 300).trim();
  const params = useMemo(() => new URLSearchParams({ ...(q && { search: q }), ...(status && { status }) }).toString(), [q, status]);
  const { data, isPending, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ["shop-sales", params],
    queryFn: async ({ pageParam }): Promise<SalesPage> => {
      const p = new URLSearchParams(params);
      if (pageParam) p.set("cursor", pageParam);
      const res = await fetch(`/api/shop/sales?${p}`);
      if (!res.ok) throw new Error("Couldn't load sales");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: params ? undefined : ({ pages: [initial], pageParams: [""] } as InfiniteData<SalesPage, string>),
  });
  const sales = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sales this month" value={formatCurrency(summary.total)} note={`${summary.sales} sales`} tone="success" />
        <StatCard label="Items sold" value={summary.items} />
        <StatCard label="On accounts" value={formatCurrency(summary.onAccount)} note="Billed as invoices" />
        <StatCard label="Best seller" value={summary.top[0]?.name ?? "—"} note={summary.top[0] ? `${summary.top[0].quantity} sold` : undefined} />
      </div>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label="Search sales" placeholder="Search sale number or customer" className="pr-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            {isFetching && !isFetchingNextPage && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? "" : v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any status</SelectItem>
                {Object.entries(SALE_STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {params ? (
            <Button variant="ghost" onClick={() => (setSearch(""), setStatus(""))} className="justify-self-start">
              <X /> Clear
            </Button>
          ) : (
            <span />
          )}
          <ExportDropdown<SaleRow>
            filename="Shop sales"
            headers={["#", "Sale", "Date", "Customer", "Items", "Quantity", "Total (KES)", "Paid by", "Reference", "Status"]}
            rows={sales.map(saleExport)}
          />
        </div>
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">The sales didn&apos;t load.</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw /> Try again
            </Button>
          </div>
        ) : sales.length === 0 ? (
          <div className="grid place-items-center gap-3 px-4 py-14 text-center">
            <p className="font-medium">{params ? "No sales match." : "No sales yet."}</p>
            {!params && (
              <Button asChild>
                <Link href="/shop/new">
                  <ShoppingCart /> New sale
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {isMobile ? (
              <div className="divide-y">
                {sales.map((s) => (
                  <Link key={s.id} href={`/shop/sales/${s.saleNumber}`} className="grid gap-1 px-4 py-3 leading-tight">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{s.saleNumber}</span>
                      <span className="tabular font-bold">{formatCurrency(s.total)}</span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {s.customer ?? "Walk-in"} · {s.summary}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <SaleStatusBadge status={s.status} /> {when(s.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Sale</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead className="pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="pl-4">
                        <Link href={`/shop/sales/${s.saleNumber}`} className="font-mono text-sm font-semibold hover:underline">
                          {s.saleNumber}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{when(s.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.athleteId ? (
                          <Link href={`/players/user-profile/${s.athleteId}`} className="hover:underline">
                            {s.customer}
                          </Link>
                        ) : (
                          (s.customer ?? <span className="text-muted-foreground">Walk-in</span>)
                        )}
                      </TableCell>
                      <TableCell className="max-w-72 truncate text-sm" title={s.summary}>
                        {s.summary}
                      </TableCell>
                      <TableCell className="tabular text-right font-semibold">{formatCurrency(s.total)}</TableCell>
                      <TableCell className="text-sm">
                        {paidBy(s)}
                        {s.invoice && <span className="block font-mono text-xs text-muted-foreground">{s.invoice.invoiceNumber}</span>}
                        {s.reference && <span className="block font-mono text-xs text-muted-foreground">{s.reference}</span>}
                      </TableCell>
                      <TableCell className="pr-4">
                        <SaleStatusBadge status={s.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <LoadMore shown={sales.length} total={data?.pages[0]?.total} noun={["sale", "sales"]} hasNextPage={!!hasNextPage} isFetchingNextPage={isFetchingNextPage} fetchNextPage={fetchNextPage} />
          </>
        )}
      </section>
    </div>
  );
}

const moveExport = (m: MovementRow, i: number) => [String(i + 1), when(m.createdAt), m.item, MOVE_LABEL[m.kind] ?? m.kind, String(m.quantity), String(m.balance), m.saleNumber ?? m.note ?? "", m.by ?? ""];

function StockTab({ initial, data }: { initial: MovementsPage; data: Catalogue }) {
  const isMobile = useIsMobile();
  const q = useInfiniteQuery({
    queryKey: ["shop-stock"],
    queryFn: async ({ pageParam }): Promise<MovementsPage> => {
      const res = await fetch(`/api/shop/stock?${new URLSearchParams(pageParam ? { cursor: pageParam } : {})}`);
      if (!res.ok) throw new Error("Couldn't load stock");
      return res.json();
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialData: { pages: [initial], pageParams: [""] } as InfiniteData<MovementsPage, string>,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];
  const value = data.products.reduce((s, p) => s + p.price * p.variants.reduce((n, v) => n + v.stock, 0), 0);
  const items = data.products.reduce((s, p) => s + p.variants.reduce((n, v) => n + v.stock, 0), 0);
  const out = data.products.reduce((s, p) => s + p.variants.filter((v) => v.stock === 0).length, 0);
  const low = data.products.reduce((s, p) => s + p.variants.filter((v) => v.stock > 0 && v.stock <= data.lowStockLevel).length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Items in stock" value={items} />
        <StatCard label="Stock value" value={formatCurrency(value)} note="At selling price" />
        <StatCard label="Low" value={low} note={`${data.lowStockLevel} or fewer`} tone={low ? "warning" : "default"} />
        <StatCard label="Sold out" value={out} note="Sizes" tone={out ? "danger" : "default"} />
      </div>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-semibold">Stock movements</h2>
          <ExportDropdown<MovementRow> filename="Stock movements" headers={["#", "Date", "Item", "What", "Change", "Left", "Sale or note", "By"]} rows={rows.map(moveExport)} />
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-muted-foreground">No stock recorded yet.</p>
        ) : isMobile ? (
          <div className="divide-y">
            {rows.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-medium">{m.item}</span>
                  <span className="text-xs text-muted-foreground">
                    {MOVE_LABEL[m.kind]} · {when(m.createdAt)}
                    {(m.saleNumber || m.note) && ` · ${m.saleNumber ?? m.note}`}
                  </span>
                </span>
                <span className="text-right">
                  <span className={cn("tabular block font-mono font-semibold", m.quantity > 0 ? "text-success" : "text-destructive")}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</span>
                  <span className="text-xs text-muted-foreground">{m.balance} left</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">When</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Left</TableHead>
                <TableHead>Sale or note</TableHead>
                <TableHead className="pr-4">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="pl-4 text-sm whitespace-nowrap">{when(m.createdAt)}</TableCell>
                  <TableCell className="text-sm font-medium">{m.item}</TableCell>
                  <TableCell className="text-sm">{MOVE_LABEL[m.kind] ?? m.kind}</TableCell>
                  <TableCell className={cn("tabular text-right font-mono font-semibold", m.quantity > 0 ? "text-success" : "text-destructive")}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                  <TableCell className="tabular text-right font-mono">{m.balance}</TableCell>
                  <TableCell className="text-sm">
                    {m.saleNumber ? (
                      <Link href={`/shop/sales/${m.saleNumber}`} className="font-mono hover:underline">
                        {m.saleNumber}
                      </Link>
                    ) : (
                      (m.note ?? <span className="text-muted-foreground">—</span>)
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-sm text-muted-foreground">{m.by ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 0 && (
          <LoadMore shown={rows.length} total={q.data?.pages[0]?.total} noun={["movement", "movements"]} hasNextPage={!!q.hasNextPage} isFetchingNextPage={q.isFetchingNextPage} fetchNextPage={q.fetchNextPage} />
        )}
      </section>
    </div>
  );
}

export function ShopPage({
  tab,
  catalogue,
  archived,
  sales,
  summary,
  movements,
}: {
  tab: string;
  catalogue: Catalogue;
  archived: Catalogue | null;
  sales: SalesPage;
  summary: React.ComponentProps<typeof SalesTab>["summary"];
  movements: MovementsPage;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (p: Record<string, string>) => router.replace(`${pathname}?${new URLSearchParams({ tab, ...p })}`, { scroll: false });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop"
        description="Kit for sale, sales and stock."
        actions={
          <Button asChild>
            <Link href="/shop/new">
              <ShoppingCart /> New sale
            </Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(t) => go({ tab: t })}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
          </TabsList>
          {tab === "catalogue" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={!!archived} onCheckedChange={(v) => go(v ? { archived: "1" } : {})} /> Show off sale
            </label>
          )}
        </div>
        <TabsContent value="catalogue" className="mt-4">
          <CatalogueTab data={catalogue} archived={archived} />
        </TabsContent>
        <TabsContent value="sales" className="mt-4">
          <SalesTab initial={sales} summary={summary} />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <StockTab initial={movements} data={catalogue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
