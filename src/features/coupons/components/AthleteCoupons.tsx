"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Tag, Ticket, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { formatAcademy } from "@/lib/academy-time";
import { checkCouponForAthlete, giveCouponToAthlete, removeCouponFromAthlete } from "../actions/redeem";
import { durationLabel } from "../lib/state";
import type { AthleteCouponOption } from "../queries";

/** A coupon given to the athlete, as the profile has it */
export type GivenCoupon = {
  id: string;
  status: "ACTIVE" | "ENDED" | "REMOVED";
  invoicesLeft: number | null;
  createdAt: string | Date;
  coupon: { name: string; discountType: string; value: unknown; duration: string; durationCount: number | null };
  _count: { discounts: number };
};

const off = (c: { discountType: string; value: unknown }) => (c.discountType === "PERCENTAGE" ? `${Number(c.value)}%` : formatCurrency(Number(c.value)));
const day = (d: string | Date) => formatAcademy(d, { day: "numeric", month: "short", year: "numeric" });

function left(g: GivenCoupon) {
  if (g.status === "REMOVED") return "Removed";
  if (g.status === "ENDED") return `Used (${g._count.discounts} invoice${g._count.discounts === 1 ? "" : "s"})`;
  return g.invoicesLeft == null ? "Every fees invoice" : `Next ${g.invoicesLeft} fees invoice${g.invoicesLeft === 1 ? "" : "s"}`;
}

/**
 * The athlete's coupons: the ones given (each discounts their next fees invoices, once, N times
 * or always), and giving one, after Check says whether and why it applies.
 */
export function AthleteCoupons({ athleteId, given, options }: { athleteId: string; given: GivenCoupon[]; options: AthleteCouponOption[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const normalized = code.trim().toUpperCase();
  const active = given.filter((g) => g.status === "ACTIVE");
  const past = given.filter((g) => g.status !== "ACTIVE");

  const run = (action: () => Promise<{ success: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      const res = await action();
      setResult({ ok: res.success, message: res.message });
      if (res.success) after?.();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-label="Coupons on this athlete" className="space-y-3 rounded-xl border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Tag className="size-4" /> On this athlete
        </h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coupon is discounting their fees invoices.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((g) => (
              <li key={g.id} className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">
                    {g.coupon.name} <span className="font-sans font-normal text-muted-foreground">· {off(g.coupon)} off</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {left(g)} · given {day(g.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await removeCouponFromAthlete(athleteId, g.id);
                      if (!res.success) return void toast.error(res.message);
                      toast.success(res.message);
                      router.refresh();
                    })
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Earlier coupons ({past.length})</summary>
            <ul className="mt-2 space-y-1">
              {past.map((g) => (
                <li key={g.id} className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {g.coupon.name} · {off(g.coupon)}
                  </span>
                  <span>
                    {left(g)} · {day(g.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-label="Give a coupon" className="space-y-3 rounded-xl border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Ticket className="size-4" /> Give a coupon
        </h3>
        <p className="text-xs text-muted-foreground">
          It discounts their next fees invoices (once, a number of times, or every one). For an invoice that&apos;s already out, use Apply coupon on the
          invoice.
        </p>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {options.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCode(c.name);
                  setResult(null);
                }}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-left text-xs transition hover:bg-muted/40",
                  normalized === c.name && "border-primary bg-primary/5",
                )}
              >
                <span className="font-mono font-semibold">{c.name}</span>{" "}
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {off(c)}
                </Badge>
                <span className="block text-[11px] text-muted-foreground">
                  {durationLabel(c)}
                  {c.plans.length ? ` · ${c.plans.join(", ")}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-label="Coupon code"
            placeholder="Coupon code, e.g. WELCOME10"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setResult(null);
            }}
            className="h-10 font-mono uppercase"
            disabled={pending}
          />
          <Button type="button" variant="outline" className="h-10" disabled={pending || !normalized} onClick={() => run(() => checkCouponForAthlete(athleteId, normalized))}>
            Check
          </Button>
          <Button
            type="button"
            className="h-10"
            disabled={pending || !normalized}
            onClick={() =>
              run(
                () => giveCouponToAthlete(athleteId, normalized),
                () => {
                  setCode("");
                  router.refresh();
                },
              )
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Give
          </Button>
        </div>
        {result && (
          <p role="status" className={cn("flex gap-2 text-sm", result.ok ? "text-success" : "text-destructive")}>
            {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
            {result.message}
          </p>
        )}
      </section>
    </div>
  );
}
