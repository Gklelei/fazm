"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoField } from "@/components/form/PhotoField";
import { cn } from "@/lib/utils";
import { saveProduct } from "../actions/shop";
import type { ProductRow } from "../queries";
import { KID_SIZES, PRODUCT_CATEGORIES, SIZE_PRESETS } from "../schemas";

type Size = { id?: string; size: string; colour: string; opening: string };

/** Add or change a product: photo, name, price, and its sizes (new ones can start with stock). */
export function ProductDialog({ product, onClose }: { product: ProductRow | null; onClose: () => void }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState(() => ({
    name: product?.name ?? "",
    category: (product?.category ?? "JERSEY") as (typeof PRODUCT_CATEGORIES)[number]["value"],
    description: product?.description ?? "",
    photo: product?.photo ?? "",
    price: product ? String(product.price) : "",
  }));
  const [sizes, setSizes] = useState<Size[]>(() => product?.variants.map((v) => ({ id: v.id, size: v.size, colour: v.colour, opening: "" })) ?? []);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const edit = (i: number, p: Partial<Size>) => setSizes((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const addPreset = (list: readonly string[]) => setSizes((s) => [...s, ...list.filter((z) => !s.some((x) => x.size === z && !x.colour)).map((size) => ({ size, colour: "", opening: "" }))]);

  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveProduct({ id: product?.id, ...f, variants: sizes.map((s) => ({ id: s.id, size: s.size, colour: s.colour, opening: s.id ? 0 : s.opening || 0 })) });
      if (!res.success) return setError(res.message);
      toast.success(res.message);
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? product.name : "New product"}</DialogTitle>
          <DialogDescription>{product ? "Change its details or sizes. Use Receive stock for deliveries." : "Add each size, with how many you have now."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <PhotoField folder="PRODUCTS" value={f.photo} onChange={(photo) => set({ photo })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" placeholder="e.g. Home jersey 2026" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!product} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">Price (KES)</Label>
              <Input id="p-price" inputMode="decimal" className="tabular font-mono" value={f.price} onChange={(e) => set({ price: e.target.value })} />
            </div>
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Type</legend>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_CATEGORIES.map((c) => (
                <label key={c.value} className={cn("cursor-pointer rounded-md border px-3 py-1.5 text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring", f.category === c.value && "border-primary bg-primary/5 font-medium")}>
                  <input type="radio" name="p-category" className="sr-only" checked={f.category === c.value} onChange={() => set({ category: c.value })} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-medium">
              Sizes
              <span className="flex gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => addPreset(SIZE_PRESETS)}>
                  Adult XS–XXL
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addPreset(KID_SIZES)}>
                  Kids 6–15
                </Button>
              </span>
            </legend>
            {sizes.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_6rem_auto] gap-2 text-xs text-muted-foreground">
                <span>Size</span>
                <span>Colour</span>
                <span>{product ? "Start with" : "In stock"}</span>
                <span className="w-9" />
              </div>
            )}
            {sizes.map((s, i) => (
              <div key={s.id ?? i} className="grid grid-cols-[1fr_1fr_6rem_auto] gap-2">
                <Input aria-label="Size" placeholder="One size" value={s.size} onChange={(e) => edit(i, { size: e.target.value })} />
                <Input aria-label="Colour" placeholder="Any" value={s.colour} onChange={(e) => edit(i, { colour: e.target.value })} />
                {s.id ? (
                  <span className="self-center text-sm text-muted-foreground">—</span>
                ) : (
                  <Input aria-label={`Stock for ${s.size || "this size"}`} inputMode="numeric" placeholder="0" className="tabular font-mono" value={s.opening} onChange={(e) => edit(i, { opening: e.target.value })} />
                )}
                <Button type="button" variant="ghost" size="icon" aria-label="Remove size" onClick={() => setSizes((x) => x.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setSizes((x) => [...x, { size: "", colour: "", opening: "" }])}>
              <Plus /> Add size
            </Button>
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
