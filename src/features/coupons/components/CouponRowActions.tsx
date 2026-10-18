"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, Eye, MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { setCouponActive, setCouponArchived } from "../actions/coupons";
import { COUPON_STATE_LABEL, type CouponState } from "../lib/state";

const TONE: Record<CouponState, "success" | "neutral" | "info" | "danger" | "warning"> = {
  ON: "success",
  OFF: "neutral",
  NOT_STARTED: "info",
  EXPIRED: "danger",
  USED_UP: "warning",
  ARCHIVED: "neutral",
};

export const CouponStateBadge = ({ state }: { state: CouponState }) => (
  <StatusBadge status={state} tone={TONE[state]}>
    {COUPON_STATE_LABEL[state]}
  </StatusBadge>
);

/** The "…" menu for one coupon, on list rows and its page: open, edit, switch on/off, archive. */
export function CouponActionsMenu({
  coupon: c,
  onChanged,
  onPage,
}: {
  coupon: { id: string; name: string; status: number };
  onChanged: () => void;
  /** On its own page: no Open / Edit (Edit is a button there), outlined trigger */
  onPage?: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const on = c.status === 1;

  const run = (fn: () => Promise<{ success: boolean; message: string }>) =>
    start(async () => {
      setConfirm(false);
      const res = await fn();
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      onChanged();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={onPage ? "outline" : "ghost"}
            size="icon"
            className={onPage ? undefined : "size-8"}
            disabled={pending}
            aria-label={`Actions for ${c.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!onPage && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/coupons/${c.id}`}>
                  <Eye /> View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/coupons/${c.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => run(() => setCouponActive(c.id, !on))}>
            {on ? <PowerOff /> : <Power />} {on ? "Switch off" : "Switch on"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Archive /> Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {c.name}?</AlertDialogTitle>
            <AlertDialogDescription>It can&apos;t be applied any more. Discounts it already gave stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => run(() => setCouponArchived(c.id, true))}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
