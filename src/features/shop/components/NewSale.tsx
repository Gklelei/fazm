"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Minus, Plus, Search, Shirt, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { AthletePicker, type PickedAthlete } from "@/features/athletes/components/AthletePicker";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createSale } from "../actions/shop";
import type { Catalogue } from "../queries";
import { PRODUCT_CATEGORIES, SALE_PAYMENTS } from "../schemas";

type Payment = (typeof SALE_PAYMENTS)[number]["value"];
const sizeLabel = (v: { size: string; colour: string }) => [v.size || "One size", v.colour].filter(Boolean).join(" · ");

/** Staff build the order like a cart: tap a size to add it, then who and how they paid. */
export function NewSale({ catalogue, athlete: preset }: { catalogue: Catalogue; athlete: PickedAthlete | null }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [athlete, setAthlete] = useState<PickedAthlete | null>(preset);
  const [customerName, setCustomerName] = useState("");
  const [payment, setPayment] = useState<Payment>("MPESA");
  const [reference, setReference] = useState("");

  const variants = useMemo(() => new Map(catalogue.products.flatMap((p) => p.variants.map((v) => [v.id, { ...v, product: p }] as const))), [catalogue]);
  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => ({ id, quantity, v: variants.get(id)! }));
  const total = lines.reduce((s, l) => s + l.quantity * l.v.product.price, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const shown = catalogue.products.filter((p) => (!category || p.category === category) && p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const add = (id: string, by = 1) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min((c[id] ?? 0) + by, variants.get(id)?.stock ?? 0)) }));

  const save = () => {
    setError(null);
    if (payment === "ACCOUNT" && !athlete) return setError("Pick the athlete to charge.");
    start(async () => {
      const res = await createSale({ athleteId: athlete?.athleteId ?? "", customerName, payment, reference, lines: lines.map((l) => ({ variantId: l.id, quantity: l.quantity })) });
      if (!("saleNumber" in res)) return setError(res.message);
      toast.success(res.message);
      router.push(`/shop/sales/${res.saleNumber}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/shop">
          <ArrowLeft /> Shop
        </Link>
      </Button>
      <PageHeader title="New sale" description="Tap a size to add it." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" aria-label="Search products" placeholder="Search products" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "", label: "All" }, ...PRODUCT_CATEGORIES.filter((c) => catalogue.products.some((p) => p.category === c.value))].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn("rounded-md border px-3 py-1.5 text-sm", category === c.value ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/40")}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">{catalogue.products.length ? "No products match." : "Add products in the shop catalogue first."}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <article key={p.id} className="flex gap-3 rounded-xl border bg-card p-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt="" className="size-full object-cover" />
                    ) : (
                      <Shirt className="absolute inset-0 m-auto size-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 content-start gap-2">
                    <div className="leading-tight">
                      <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                      <p className="tabular text-sm font-bold text-primary">{formatCurrency(p.price)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.variants.map((v) => {
                        const inCart = cart[v.id] ?? 0;
                        const left = v.stock - inCart;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={left <= 0}
                            onClick={() => add(v.id)}
                            aria-label={`Add ${p.name} ${sizeLabel(v)}, ${v.stock} in stock`}
                            className={cn(
                              "relative rounded-md border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
                              inCart ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:bg-primary/5",
                            )}
                          >
                            {sizeLabel(v)}
                            <span className={cn("ml-1 font-mono font-normal", inCart ? "text-primary-foreground/80" : "text-muted-foreground")}>{inCart ? `×${inCart}` : v.stock}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside id="cart" className="scroll-mt-20 space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-20">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="size-4 text-primary" /> Sale
            {count > 0 && <span className="text-sm font-normal text-muted-foreground">{count === 1 ? "1 item" : `${count} items`}</span>}
          </h2>
          {lines.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">Nothing added yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate font-medium">{l.v.product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {sizeLabel(l.v)} · {formatCurrency(l.v.product.price)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" className="size-7" aria-label="One fewer" onClick={() => add(l.id, -1)}>
                      {l.quantity === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                    </Button>
                    <span className="tabular w-6 text-center font-mono">{l.quantity}</span>
                    <Button type="button" variant="outline" size="icon" className="size-7" aria-label="One more" disabled={l.quantity >= l.v.stock} onClick={() => add(l.id)}>
                      <Plus className="size-3.5" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-baseline justify-between border-t pt-3 font-semibold">
            Total <span className="tabular font-display text-2xl font-bold">{formatCurrency(total)}</span>
          </p>

          <div className="grid gap-1.5">
            <Label htmlFor="sale-athlete">Athlete</Label>
            <AthletePicker id="sale-athlete" value={athlete} onChange={(a) => (setAthlete(a), !a && payment === "ACCOUNT" && setPayment("MPESA"))} />
          </div>
          {!athlete && (
            <div className="grid gap-1.5">
              <Label htmlFor="sale-name">Or customer name</Label>
              <Input id="sale-name" placeholder="Walk-in" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          )}
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Paid by</legend>
            <div className="grid grid-cols-3 gap-2">
              {SALE_PAYMENTS.map((m) => {
                const off = m.value === "ACCOUNT" && !athlete;
                return (
                  <label
                    key={m.value}
                    className={cn(
                      "flex cursor-pointer items-center justify-center rounded-md border px-2 py-2 text-center text-sm leading-tight has-focus-visible:ring-2 has-focus-visible:ring-ring",
                      payment === m.value && "border-primary bg-primary/5 font-medium",
                      off && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input type="radio" name="sale-payment" className="sr-only" disabled={off} checked={payment === m.value} onChange={() => setPayment(m.value)} />
                    {m.label}
                  </label>
                );
              })}
            </div>
            {payment === "ACCOUNT" && <p className="text-xs text-muted-foreground">Added to their invoices to pay later.</p>}
          </fieldset>
          {payment === "MPESA" && (
            <div className="grid gap-1.5">
              <Label htmlFor="sale-ref">M-Pesa code</Label>
              <Input id="sale-ref" className="font-mono uppercase" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" size="lg" disabled={saving || !lines.length} onClick={save}>
            {saving && <Loader2 className="animate-spin" />} {payment === "ACCOUNT" ? "Charge" : "Record sale"} {total > 0 && formatCurrency(total)}
          </Button>
        </aside>
      </div>

      {count > 0 && (
        <a href="#cart" className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg lg:hidden">
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-4" /> {count === 1 ? "1 item" : `${count} items`}
          </span>
          <span className="tabular">{formatCurrency(total)}</span>
        </a>
      )}
    </div>
  );
}
