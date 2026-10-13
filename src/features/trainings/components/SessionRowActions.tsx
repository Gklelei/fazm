"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, Eye, Loader2, MoreHorizontal, Pencil, Trash2, UserCheck } from "lucide-react";
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
import { DeleteTrainingSession } from "../actions/delete-session";

export function SessionRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, start] = useTransition();

  const remove = () =>
    start(async () => {
      const res = await DeleteTrainingSession(id);
      if (!res.success) return void toast.error(res.message);
      toast.success(`${name} deleted`);
      setConfirm(false);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/sessions/view/${id}`}>
              <Eye /> Open session
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/sessions/attendance/mark/${id}`}>
              <UserCheck /> Take attendance
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/assesments/${id}/mark`}>
              <ClipboardCheck /> Assess athletes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/sessions/edit/${id}`}>
              <Pencil /> Edit session
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the schedule for coaches and admins. Attendance
              already taken stays in athlete records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep session</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              Delete session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
