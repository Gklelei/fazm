"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import type { AthleteListRow } from "../queries/list";
import { athleteName } from "../lib/names";
import { AthleteActionsMenu, AthleteStatusMenu } from "./AthleteRowActions";

/** Roster row for small screens. */
export default function AthleteCard({ athlete: a }: { athlete: AthleteListRow }) {
  const guardian = a.guardians[0];
  return (
    <div className="flex gap-3 px-4 py-3">
      <ProfileAvatar name={athleteName(a)} url={a.profilePIcture ?? ""} size={44} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/players/user-profile/${a.athleteId}`}
            className="grid min-w-0 leading-tight"
          >
            <span className="truncate font-medium">{athleteName(a)}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {a.athleteId}
              {a.batches && <> · {a.batches.name}</>}
              {a.age != null && <> · {a.age} yrs</>}
            </span>
          </Link>
          <AthleteActionsMenu athlete={a} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <AthleteStatusMenu athlete={a} />
          {guardian?.phoneNumber && (
            <a
              href={`tel:${guardian.phoneNumber}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Phone className="size-3" /> {guardian.fullNames.split(" ")[0]}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
