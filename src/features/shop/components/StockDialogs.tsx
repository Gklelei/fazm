"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adjustStock, receiveStock } from "../actions/shop";
import type { ProductRow } from "../queries";

const sizeLabel = (v: { size: string; colour: string }) => [v.size || "One size", v.colour].filter(Boolean).join(" · ");

/** A delivery (how many came in per size), or a count (what's actually there, with the reason). */
export function StockDialog({ product, mode, onClose }: { product: ProductRow; mode: "receive" | "count"; onClose: () => void }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const receive = mode === "receive";

  const save = () => {
    setError(null);
    start(async () => {
      if (receive) {
        const res = await receiveStock({ lines: product.variants.map((v) => ({ variantId: v.id, quantity: qty[v.id] || 0 })), note });
        if (!res.success) return setError(res.message);
        toast.success(res.message);
      } else {
        const changed = product.variants.filter((v) => qty[v.id]?.trim() && Number(qty[v.id]) !== v.stock);
        if (!changed.length) return setError("Enter the count for the sizes that are different.");
        for (const v of changed) {
          const res = await adjustStock({ variantId: v.id, count: qty[v.id], note });
          if (!res.success) return setError(res.message);
        }
        toast.success(`${product.name}: stock corrected`);
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {receive ? "Receive stock" : "Correct stock"} · {product.name}
          </DialogTitle>
          <DialogDescription>{receive ? "Enter how many came in for each size." : "Enter what you counted for the sizes that are different."}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-md border">
          {product.variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="grid leading-tight">
                <span className="font-medium">{sizeLabel(v)}</span>
                <span className="text-xs text-muted-foreground">{v.stock} in stock</span>
              </span>
              <Input
                aria-label={`${receive ? "Received" : "Counted"} ${sizeLabel(v)}`}
                inputMode="numeric"
                placeholder={receive ? "0" : String(v.stock)}
                className="tabular h-9 w-24 text-right font-mono"
                value={qty[v.id] ?? ""}
                onChange={(e) => setQty((q) => ({ ...q, [v.id]: e.target.value }))}
              />
            </li>
          ))}
        </ul>
        <div className="grid gap-1.5">
          <Label htmlFor="stock-note">{receive ? "Note" : "Reason"}</Label>
          <Input id="stock-note" placeholder={receive ? "e.g. supplier delivery note" : "e.g. damaged, or stock count"} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} {receive ? "Add to stock" : "Save counts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
