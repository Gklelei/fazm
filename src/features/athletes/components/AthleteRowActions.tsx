"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Eye, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ATHLETE_ACCOUNT_STATUS } from "@/generated/prisma/enums";
import { DeleteAthlete } from "../actions/delete-athlete";
import { UpdateAthleteStatus } from "../actions/update-status";
import type { AthleteListRow } from "../queries/list";
import { athleteName } from "../lib/names";

export const ATHLETE_STATUS_LABEL: Partial<Record<ATHLETE_ACCOUNT_STATUS, string>> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  DEACTIVATED: "Inactive",
};

/** Status pill that doubles as the menu to change it. */
export function AthleteStatusMenu({ athlete }: { athlete: AthleteListRow }) {
  const queryClient = useQueryClient();
  const [pending, start] = useTransition();

  const change = (status: string) =>
    start(async () => {
      const res = await UpdateAthleteStatus({
        athleteId: athlete.athleteId,
        status: status as ATHLETE_ACCOUNT_STATUS,
      });
      if (!res.success) return void toast.error(res.message);
      toast.success(`${athlete.firstName} is now ${ATHLETE_STATUS_LABEL[status as ATHLETE_ACCOUNT_STATUS]?.toLowerCase()}`);
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="inline-flex items-center gap-0.5 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Change status for ${athlete.firstName}`}
      >
        <StatusBadge status={athlete.status}>
          {ATHLETE_STATUS_LABEL[athlete.status] ?? athlete.status}
        </StatusBadge>
        {pending ? (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3 text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Set status
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={athlete.status} onValueChange={change}>
          {Object.entries(ATHLETE_STATUS_LABEL).map(([value, label]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AthleteActionsMenu({ athlete }: { athlete: AthleteListRow }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [deleting, start] = useTransition();
  const name = athleteName(athlete);

  const remove = () =>
    start(async () => {
      const res = await DeleteAthlete(athlete.athleteId);
      if (res.status !== "SUCCESS") {
        toast.error(res.errorMessage ?? "Couldn't remove the athlete.");
        return;
      }
      toast.success(`${name} removed from the roster`);
      setConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/players/user-profile/${athlete.athleteId}`}>
              <Eye /> View profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/players/edit/${athlete.athleteId}`}>
              <Pencil /> Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They leave the roster and their uploaded documents are deleted.
              Payment and attendance history is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep athlete</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />}
              Remove athlete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
