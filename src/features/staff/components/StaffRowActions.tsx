"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, Eye, KeyRound, MoreHorizontal, Pencil } from "lucide-react";
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
import { resetStaffPassword, setStaffArchived } from "../actions/save-staff";
import { TempPasswordDialog } from "./TempPasswordDialog";

export type StaffMenuTarget = { staffId: string; name: string; email: string; signsIn: boolean; self: boolean };

/**
 * The "…" menu for one staff member, on list rows and their page: open,
 * edit, a new one-time password, archive.
 */
export function StaffActionsMenu({
  staff: s,
  onChanged,
  onPage,
}: {
  staff: StaffMenuTarget;
  onChanged: () => void;
  /** On their own page: no Open / Edit (Edit is a button there), outlined trigger */
  onPage?: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"password" | "archive" | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const canManage = !s.self;
  if (onPage && !canManage) return null;

  const run = (what: "password" | "archive") =>
    start(async () => {
      setConfirm(null);
      if (what === "password") {
        const res = await resetStaffPassword(s.staffId);
        if (!res.success || !("tempPassword" in res)) return void toast.error(res.message);
        return setPassword(res.tempPassword);
      }
      const res = await setStaffArchived(s.staffId, true);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      onChanged();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={onPage ? "secondary" : "ghost"}
            size="icon"
            className={onPage ? "size-10" : "size-8"}
            disabled={pending}
            aria-label={`Actions for ${s.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {!onPage && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/staff/${s.staffId}`}>
                  <Eye /> View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/staff/${s.staffId}/edit`}>
                  <Pencil /> Edit
                </Link>
              </DropdownMenuItem>
            </>
          )}
          {canManage && (
            <>
              {!onPage && <DropdownMenuSeparator />}
              {s.signsIn && (
                <DropdownMenuItem onSelect={() => setConfirm("password")}>
                  <KeyRound /> New one-time password
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("archive")}>
                <Archive /> Archive
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "password" ? `New password for ${s.name}?` : `Archive ${s.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "password"
                ? "They'll be signed out and need the new password to sign in."
                : s.signsIn
                  ? "They'll be signed out and can't sign in. You can restore them later."
                  : "They'll leave the staff list. You can restore them later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm === "archive" ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
              onClick={() => confirm && run(confirm)}
            >
              {confirm === "password" ? "Give new password" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TempPasswordDialog name={s.name} email={s.email} password={password} onClose={() => setPassword(null)} />
    </>
  );
}
