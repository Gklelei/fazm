"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/** Edit and Archive/Restore for one settings item. Archiving asks first; restoring doesn't. */
export function RowMenu({
  name,
  archived,
  editLabel = "Edit",
  onEdit,
  archiveNote,
  setArchived,
  children,
}: {
  name: string;
  archived: boolean;
  editLabel?: string;
  onEdit: () => void;
  archiveNote: string;
  setArchived: (archived: boolean) => Promise<ActionResult>;
  children?: React.ReactNode; // extra menu items
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  const run = (to: boolean) =>
    start(async () => {
      const res = await setArchived(to);
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      setConfirm(false);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={`Actions for ${name}`}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {archived ? (
            <DropdownMenuItem onSelect={() => run(false)}>
              <ArchiveRestore /> Restore
            </DropdownMenuItem>
          ) : (
            <>
              {children}
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> {editLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setConfirm(true)}
              >
                <Archive /> Archive
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveNote} You can restore it any time from Show archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                run(true);
              }}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
