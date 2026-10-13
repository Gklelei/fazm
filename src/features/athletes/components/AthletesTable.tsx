"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import type { AthleteListRow } from "../queries/list";
import { athleteName } from "../lib/names";
import { AthleteActionsMenu, AthleteStatusMenu } from "./AthleteRowActions";

export default function AthletesTable({ athletes }: { athletes: AthleteListRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Athlete</TableHead>
          <TableHead>Batch</TableHead>
          <TableHead className="text-right">Age</TableHead>
          <TableHead>Guardian</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Registered</TableHead>
          <TableHead className="w-12 pr-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {athletes.map((a) => {
          const guardian = a.guardians[0];
          return (
            <TableRow key={a.id}>
              <TableCell className="pl-4">
                <Link
                  href={`/players/user-profile/${a.athleteId}`}
                  className="group flex items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <ProfileAvatar name={athleteName(a)} url={a.profilePIcture ?? ""} size={36} />
                  <span className="grid min-w-0 leading-tight">
                    <span className="truncate font-medium group-hover:underline">
                      {athleteName(a)}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {a.athleteId}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell>{a.batches?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="tabular text-right">{a.age ?? "—"}</TableCell>
              <TableCell>
                {guardian ? (
                  <span className="grid leading-tight">
                    <span className="truncate">{guardian.fullNames}</span>
                    {guardian.phoneNumber && (
                      <a
                        href={`tel:${guardian.phoneNumber}`}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground"
                      >
                        {guardian.phoneNumber}
                      </a>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <AthleteStatusMenu athlete={a} />
              </TableCell>
              <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                {format(new Date(a.createdAt), "d MMM yyyy")}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <AthleteActionsMenu athlete={a} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
