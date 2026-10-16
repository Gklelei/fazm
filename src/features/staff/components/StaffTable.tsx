"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { formatAcademy } from "@/lib/academy-time";
import { formatPhone } from "@/lib/phone";
import type { StaffRow } from "../queries/list";
import { SignInBadge } from "./SignInBadge";
import { StaffActionsMenu } from "./StaffRowActions";

const target = (s: StaffRow, meId: string) => ({
  staffId: s.staffId,
  name: s.fullNames,
  email: s.user?.email ?? s.email ?? "",
  signsIn: !!s.user && !s.user.isArchived,
  self: s.userId === meId,
});

const Dash = () => <span className="text-muted-foreground">—</span>;

export function StaffTable({ staff, meId, onChanged }: { staff: StaffRow[]; meId: string; onChanged: () => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Staff member</TableHead>
          <TableHead>Job</TableHead>
          <TableHead>Sign-in</TableHead>
          <TableHead>Batches</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Started</TableHead>
          <TableHead className="w-12 pr-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="pl-4">
              <Link
                href={`/staff/${s.staffId}`}
                className="group flex items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ProfileAvatar name={s.fullNames} url={s.photo ?? undefined} size={36} />
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-medium group-hover:underline">{s.fullNames}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.staffId}</span>
                </span>
              </Link>
            </TableCell>
            <TableCell>{s.jobTitle || <Dash />}</TableCell>
            <TableCell>
              <SignInBadge user={s.user} />
            </TableCell>
            <TableCell>{s.batches.map((b) => b.name).join(", ") || <Dash />}</TableCell>
            <TableCell>
              {s.phoneNumber ? (
                <a href={`tel:${s.phoneNumber}`} className="tabular whitespace-nowrap hover:underline">
                  {formatPhone(s.phoneNumber)}
                </a>
              ) : (
                <Dash />
              )}
            </TableCell>
            <TableCell className="tabular whitespace-nowrap text-muted-foreground">
              {s.startDate ? formatAcademy(s.startDate, { day: "numeric", month: "short", year: "numeric" }) : <Dash />}
            </TableCell>
            <TableCell className="pr-4 text-right">
              <StaffActionsMenu staff={target(s, meId)} onChanged={onChanged} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Staff row for small screens. */
export function StaffCard({ staff: s, meId, onChanged }: { staff: StaffRow; meId: string; onChanged: () => void }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <ProfileAvatar name={s.fullNames} url={s.photo ?? undefined} size={44} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/staff/${s.staffId}`} className="grid min-w-0 leading-tight">
            <span className="truncate font-medium">{s.fullNames}</span>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {s.staffId}
              {s.batches.length > 0 && <> · {s.batches.map((b) => b.name).join(", ")}</>}
            </span>
          </Link>
          <StaffActionsMenu staff={target(s, meId)} onChanged={onChanged} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <SignInBadge user={s.user} />
            {s.jobTitle && <span className="truncate text-xs text-muted-foreground">{s.jobTitle}</span>}
          </span>
          {s.phoneNumber && (
            <a href={`tel:${s.phoneNumber}`} className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" /> {formatPhone(s.phoneNumber)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
