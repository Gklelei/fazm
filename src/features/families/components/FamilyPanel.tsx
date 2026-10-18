"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileDown, Link2, Loader2, Unlink, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { linkSiblings, unlinkSibling } from "../actions/link";
import type { Family, FamilyMember } from "../queries";

/** Brothers and sisters billed together, and athletes whose guardian has the same phone. */
export default function FamilyPanel({ athleteId, family, canManage }: { athleteId: string; family: Family; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { members, suggestions } = family;
  const total = members.reduce((t, m) => t + m.owes, 0);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  const Row = ({ m, children }: { m: FamilyMember; children?: React.ReactNode }) => (
    <li className={cn("flex items-center justify-between gap-3 px-3 py-2.5", m.athleteId === athleteId && "bg-muted/40")}>
      <div className="min-w-0">
        <Link href={`/players/user-profile/${m.athleteId}`} className="block truncate text-sm font-semibold hover:underline">
          {m.name}
        </Link>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{m.athleteId}</span>
          {m.batch && <span>{m.batch}</span>}
          <StatusBadge status={m.status} />
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn("text-sm font-semibold tabular-nums", m.owes > 0 ? "text-destructive" : "text-success")}>{formatCurrency(m.owes)}</span>
        {children}
      </div>
    </li>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1.5">
              <UsersRound className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold">Family</CardTitle>
          </div>
          {canManage && members.length > 1 && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/athlete/${athleteId}/family-statement`} target="_blank" rel="noopener">
                <FileDown /> Family statement
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        {members.length > 1 ? (
          <div>
            <ul className="divide-y rounded-lg border">
              {members.map((m) => (
                <Row key={m.athleteId} m={m}>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="size-8" disabled={pending} title="Take out of the family" aria-label={`Take ${m.name} out of the family`} onClick={() => run(() => unlinkSibling(m.athleteId))}>
                      <Unlink className="size-4" />
                    </Button>
                  )}
                </Row>
              ))}
            </ul>
            <p className="mt-2 flex justify-between px-3 text-sm font-semibold">
              <span>Family owes</span>
              <span className={cn("tabular-nums", total > 0 ? "text-destructive" : "text-success")}>{formatCurrency(total)}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No brothers or sisters linked.</p>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Same guardian phone</p>
            <ul className="divide-y rounded-lg border border-dashed">
              {suggestions.map((m) => (
                <Row key={m.athleteId} m={m}>
                  {m.inOtherFamily && <Badge variant="outline">In a family</Badge>}
                  {canManage && (
                    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => linkSiblings(athleteId, m.athleteId))}>
                      {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Link
                    </Button>
                  )}
                </Row>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
